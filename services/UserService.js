
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { AppError } = require('../config/errors');
const v = require('./validators');

const publicUser = (u) => {
  if (!u) return u;
  const { PasswordHash, ...rest } = u;
  return rest;
};

function dupGuard(err) {
  if (err && err.code === 'ER_DUP_ENTRY') {
    throw new AppError(409, 'That email address is already registered.');
  }
  throw err;
}

async function getById(id) {
  const rows = await query(
    'SELECT * FROM UserAccount WHERE UserID = ? AND IsArchived = FALSE',
    [id]
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

/** Donor and Recipient self-registration. */
async function register(body) {
  const role = v.str(body.Role);

  if (!['Donor', 'Recipient'].includes(role)) {
    throw new AppError(400, 'Choose Donor or Recipient.');
  }

  const rec = {
    Name: v.requireText(body.Name, 'Name', 100),
    Email: v.requireEmail(body.Email),
    Phone: v.requireText(body.Phone, 'Phone', 30),
    hash: await bcrypt.hash(v.requirePassword(body.Password), 10),
  };

  let extra = [null, null, null, null];

  if (role === 'Recipient') {
    extra = [
      'Pending',
      v.requirePositiveInt(body.HouseholdSize, 'Household size'),
      v.str(body.DietaryRestrictions) || 'None',
      v.requireText(body.EmergencyContact, 'Emergency contact', 150),
    ];
  }

  try {
    const r = await query(
      `INSERT INTO UserAccount
       (Name, Email, PasswordHash, Role, Phone, ApprovalStatus,
        HouseholdSize, DietaryRestrictions, EmergencyContact)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [rec.Name, rec.Email, rec.hash, role, rec.Phone, ...extra]
    );

    return getById(r.insertId);
  } catch (e) {
    dupGuard(e);
  }
}

/** Authenticate a user using bcrypt. */
async function login(email, password) {
  const rows = await query(
    'SELECT * FROM UserAccount WHERE Email = ? AND IsArchived = FALSE',
    [v.str(email).toLowerCase()]
  );

  const u = rows[0];

  if (!u || !(await bcrypt.compare(String(password || ''), u.PasswordHash))) {
    throw new AppError(401, 'Incorrect email or password.');
  }

  return publicUser(u);
}

/** Validate fields according to the user's role. */
function buildUpdate(role, body, existing) {
  const set = {};

  if (body.Name !== undefined) {
    set.Name = v.requireText(body.Name, 'Name', 100);
  }

  if (body.Email !== undefined) {
    set.Email = v.requireEmail(body.Email);
  }

  if (body.Phone !== undefined) {
    set.Phone = v.requireText(body.Phone, 'Phone', 30);
  }

  if (role === 'Recipient') {
    if (body.HouseholdSize !== undefined) {
      set.HouseholdSize = v.requirePositiveInt(
        body.HouseholdSize,
        'Household size'
      );
    }

    if (body.DietaryRestrictions !== undefined) {
      set.DietaryRestrictions =
        v.str(body.DietaryRestrictions) || 'None';
    }

    if (body.EmergencyContact !== undefined) {
      set.EmergencyContact = v.requireText(
        body.EmergencyContact,
        'Emergency contact',
        150
      );
    }
  }

  if (role === 'Volunteer' && body.Availability !== undefined) {
    set.Availability = v.normalizeAvailability(body.Availability);
  }

  return set;
}

/** Save validated account changes. */
async function applyUpdate(id, set, newPassword) {
  if (newPassword) {
    set.PasswordHash = await bcrypt.hash(
      v.requirePassword(newPassword),
      10
    );
  }

  const cols = Object.keys(set);

  if (!cols.length) {
    throw new AppError(400, 'Nothing to update.');
  }

  try {
    await query(
      `UPDATE UserAccount
       SET ${cols.map((c) => `${c} = ?`).join(', ')}
       WHERE UserID = ?`,
      [...cols.map((c) => set[c]), id]
    );
  } catch (e) {
    dupGuard(e);
  }

  return getById(id);
}

/** A user updates their own account. */
async function modifyAccount(id, body, file) {
  const me = await getById(id);

  if (!me) {
    throw new AppError(404, 'Account not found.');
  }

  const set = buildUpdate(me.Role, body, me);

  if (me.Role === 'Volunteer' && file) {
    set.ProfileImage = file.filename;
  }

  const updated = await applyUpdate(id, set, body.Password);

  // Remove old image only after the database update succeeds.
  if (me.Role === 'Volunteer' && file) {
    removeImage(me.ProfileImage);
  }

  return updated;
}

// ---------------- Coordinator functions ----------------

async function listUsers({ role, status, q } = {}) {
  const where = ['IsArchived = FALSE'];
  const p = [];

  if (role) {
    where.push('Role = ?');
    p.push(role);
  }

  if (status) {
    where.push('ApprovalStatus = ?');
    p.push(status);
  }

  if (q) {
    where.push('(Name LIKE ? OR Email LIKE ?)');
    p.push(`%${q}%`, `%${q}%`);
  }

  const rows = await query(
    `SELECT * FROM UserAccount
     WHERE ${where.join(' AND ')}
     ORDER BY Role, Name`,
    p
  );

  return rows.map(publicUser);
}

/** Coordinator updates an existing Donor or Recipient account. */
async function updateUser(id, body) {
  const user = await getById(id);

  if (!user || !['Donor', 'Recipient'].includes(user.Role)) {
    throw new AppError(
      404,
      'Donor or recipient account not found.'
    );
  }

  const set = buildUpdate(user.Role, body, user);

  return applyUpdate(id, set);
}

/** Coordinator creates a Volunteer account. */
async function createVolunteer(body, file) {
  const hash = await bcrypt.hash(
    v.requirePassword(body.Password),
    10
  );

  try {
    const r = await query(
      `INSERT INTO UserAccount
       (Name, Email, PasswordHash, Role, Phone,
        ProfileImage, Availability)
       VALUES (?,?,?,'Volunteer',?,?,?)`,
      [
        v.requireText(body.Name, 'Name', 100),
        v.requireEmail(body.Email),
        hash,
        v.requireText(body.Phone, 'Phone', 30),
        file ? file.filename : null,
        v.normalizeAvailability(body.Availability),
      ]
    );

    return getById(r.insertId);
  } catch (e) {
    dupGuard(e);
  }
}

/** Coordinator updates a Volunteer's details. */
async function updateVolunteer(id, body, file) {
  const u = await getById(id);

  if (!u || u.Role !== 'Volunteer') {
    throw new AppError(404, 'Volunteer not found.');
  }

  const set = buildUpdate('Volunteer', body, u);

  if (file) {
    set.ProfileImage = file.filename;
  }

  const updated = await applyUpdate(id, set, body.Password);

  // Delete the previous image only after successful update.
  if (file) {
    removeImage(u.ProfileImage);
  }

  return updated;
}

/** Coordinator approves or rejects a Recipient. */
async function setApproval(id, status) {
  if (!['Approved', 'Rejected'].includes(status)) {
    throw new AppError(
      400,
      'Status must be Approved or Rejected.'
    );
  }

  const r = await query(
    `UPDATE UserAccount
     SET ApprovalStatus = ?
     WHERE UserID = ?
       AND Role = 'Recipient'
       AND IsArchived = FALSE`,
    [status, id]
  );

  if (!r.affectedRows) {
    throw new AppError(404, 'Recipient not found.');
  }

  return getById(id);
}

/** Archive an account without deleting historical records. */
async function archiveUser(id, byId) {
  if (Number(id) === Number(byId)) {
    throw new AppError(400, 'You cannot delete your own account.');
  }

  const u = await getById(id);

  if (!u) {
    throw new AppError(404, 'Account not found.');
  }

  if (u.Role === 'Coordinator') {
    const [{ n }] = await query(
      `SELECT COUNT(*) AS n
       FROM UserAccount
       WHERE Role = 'Coordinator'
         AND IsArchived = FALSE`
    );

    if (n <= 1) {
      throw new AppError(
        400,
        'The last Coordinator account cannot be deleted.'
      );
    }
  }

  await query(
    'UPDATE UserAccount SET IsArchived = TRUE WHERE UserID = ?',
    [id]
  );

  await query(
    `UPDATE Shift
     SET Status = 'Cancelled'
     WHERE VolunteerID = ?
       AND Status = 'Scheduled'
       AND StartDateTime > NOW()`,
    [id]
  );
}

function removeImage(name) {
  if (!name) return;

  fs.unlink(
    path.join(
      __dirname,
      '..',
      'public',
      'uploads',
      path.basename(name)
    ),
    () => {}
  );
}

module.exports = {
  publicUser,
  getById,
  register,
  login,
  modifyAccount,
  listUsers,
  updateUser,
  createVolunteer,
  updateVolunteer,
  setApproval,
  archiveUser
};
