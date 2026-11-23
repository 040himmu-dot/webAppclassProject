// Connection test for the whole team. HOW TO USE:
//   1) Re-run sql/schema.sql in Workbench (fresh sample data)   2) npm start (leave it running)
//   3) In a second terminal:  npm run smoke
// It logs in as every role and walks the real workflow (donate -> approve -> request -> prepare -> pick up -> report).
// If a line says FAIL, the arrow names whose area to check first.
const base=(process.env.BASE_URL||'http://localhost:3000')+'/api';
class C{constructor(){this.c=''}
 async r(m,p,b){const o={method:m,headers:{}};if(b){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}if(this.c)o.headers.cookie=this.c;
  const res=await fetch(base+p,o);const sc=res.headers.get('set-cookie');if(sc)this.c=sc.split(';')[0];let j;try{j=await res.json()}catch{j=null}return {s:res.status,j}}}
let fails=0,total=0;
const area=(n)=>/login|anon|blocked$|cannot see|cannot create|cannot report|volunteer cannot|self/.test(n)?'Aakrosh (security)':
 /donat|inventory|categor|item|qty|stock|expired item|waste|analyzer|alert|expiry/.test(n)?'Mahima (inventory/risk)':
 /hamper|pickup|record|fulfil|delay|history|distribution|terminal|empty|over-stock|report/.test(n)?'Manjot (hampers)':
 'Mahdi (users/shifts)';
const ok=(n,c,x)=>{total++;console.log((c?'PASS ':'FAIL ')+n+(c?'':'   <-- look at '+area(n)+'  '+JSON.stringify(x).slice(0,200)));if(!c)fails++};
(async()=>{
 const adm=new C(),don=new C(),vol=new C(),rec=new C(),pend=new C(),anon=new C();
 ok('anon blocked',(await anon.r('GET','/inventory')).s===401);
 ok('bad login',(await anon.r('POST','/auth/login',{Email:'x@y.z',Password:'no'})).s===401);
 for(const [c,e] of [[adm,'admin'],[don,'donor'],[vol,'volunteer'],[rec,'recipient'],[pend,'pending']]){const r=await c.r('POST','/auth/login',{Email:e+'@foodbank.ca',Password:'pass123'});ok('login '+e,r.s===200,r)}
 ok('donor cannot see inventory',(await don.r('GET','/inventory')).s===403);
 ok('recipient cannot create category',(await rec.r('POST','/categories',{CategoryName:'X'})).s===403);
 // register
 let r=await anon.r('POST','/auth/register',{Role:'Donor',Name:'New Donor',Email:'nd@x.ca',Phone:'1',Password:'secret1'});ok('register donor',r.s===201,r);
 r=await anon.r('POST','/auth/register',{Role:'Donor',Name:'Dup',Email:'nd@x.ca',Phone:'1',Password:'secret1'});ok('dup email 409',r.s===409,r);
 r=await anon.r('POST','/auth/register',{Role:'Recipient',Name:'R2',Email:'r2@x.ca',Phone:'1',Password:'secret1',HouseholdSize:3,EmergencyContact:'Mom 604'});ok('register recipient',r.s===201&&r.j.user.ApprovalStatus==='Pending',r);
 const r2id=r.j.user.UserID;
 // pending recipient cannot request
 const t=new Date(Date.now()+3600e3);const pad=n=>String(n).padStart(2,'0');
 const loc=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
 r=await pend.r('POST','/hampers',{ScheduledDateTime:loc(t)});ok('pending cannot request',r.s===403,r);
 // coordinator approves
 r=await adm.r('PATCH',`/users/${r2id}/approval`,{Status:'Approved'});ok('approve',r.s===200,r);
 r=await adm.r('GET','/users?role=Recipient&status=Pending');ok('list pending',r.s===200&&r.j.length===1,r);
 // categories
 r=await adm.r('POST','/categories',{CategoryName:'Snacks'});ok('add category',r.s===201,r);const cid=r.j.CategoryID;
 r=await adm.r('PUT','/categories/'+cid,{CategoryName:'Snack Foods'});ok('rename category',r.s===200,r);
 r=await adm.r('DELETE','/categories/'+cid);ok('delete unused category',r.s===200,r);
 r=await adm.r('DELETE','/categories/1');ok('delete used category blocked',r.s===409,r);
 // donor donation
 const exp=new Date(Date.now()+60*864e5).toISOString().slice(0,10);
 r=await don.r('POST','/donations',{items:[{ItemName:'Pasta',Category:'Grains',Quantity:40,Unit:'boxes',ExpirationDate:exp},{ItemName:'Beans',Category:'Canned',Quantity:50,Unit:'cans',ExpirationDate:exp}]});ok('donate',r.s===201,r);
 r=await don.r('POST','/donations',{items:[{ItemName:'Old',Category:'Grains',Quantity:5,Unit:'kg',ExpirationDate:'2020-01-01'}]});ok('expired donation rejected',r.s===400,r);
 r=await don.r('POST','/donations',{items:[{ItemName:'Old',Category:'Nope',Quantity:5,Unit:'kg',ExpirationDate:exp}]});ok('bad category rejected',r.s===400,r);
 r=await don.r('GET','/donations?category=Grains');ok('donor search by category',r.s===200&&r.j.length>=2,r);
 r=await don.r('GET','/donations?from=2099-01-01');ok('donor search by date',r.s===200&&r.j.length===0,r);
 // volunteer inventory
 r=await vol.r('POST','/inventory',{DonorID:2,items:[{ItemName:'Soup',Category:'Canned',Quantity:10,Unit:'cans',ExpirationDate:exp}]});ok('volunteer intake',r.s===201,r);const soup=r.j.ids[0];
 r=await vol.r('PUT','/inventory/'+soup,{ItemName:'Chicken soup',QuantityOnHand:12});ok('modify item',r.s===200&&r.j.item.QuantityOnHand===12,r);
 r=await vol.r('PUT','/inventory/'+soup,{QuantityOnHand:-3});ok('negative qty rejected',r.s===400,r);
 r=await vol.r('GET','/inventory?category=Canned&minQty=11');ok('inventory search',r.s===200&&r.j.length>=1,r);
 r=await vol.r('DELETE','/inventory/'+soup,{recordWaste:true});ok('delete item (archive + waste)',r.s===200,r);
 // recipient requests
 r=await rec.r('POST','/hampers',{ScheduledDateTime:'2020-01-01T10:00'});ok('past time rejected',r.s===400,r);
 r=await rec.r('POST','/hampers',{ScheduledDateTime:loc(t)});ok('recipient request hamper',r.s===201,r);const {HamperID,AppointmentID}=r.j;
 r=await rec.r('POST','/hampers',{ScheduledDateTime:loc(t)});ok('second open hamper blocked',r.s===409,r);
 // volunteer prepares
 r=await vol.r('GET','/pickups?open=1');ok('volunteer sees pickup in shift',r.s===200&&r.j.some(p=>p.AppointmentID===AppointmentID&&p.InShift===1),r);
 r=await vol.r('PATCH','/pickups/'+AppointmentID+'/status',{Status:'Fulfilled'});ok('cannot fulfil empty hamper',r.s===409,r);
 r=await vol.r('POST',`/hampers/${HamperID}/distributions`,{items:[{ItemID:5,Quantity:1}]});ok('expired item blocked',r.s===409,r);
 r=await vol.r('POST',`/hampers/${HamperID}/distributions`,{items:[{ItemID:1,Quantity:9999}]});ok('over-stock blocked',r.s===409,r);
 r=await vol.r('POST',`/hampers/${HamperID}/distributions`,{items:[{ItemID:1,Quantity:5},{ItemID:4,Quantity:3}]});ok('prepare hamper',r.s===201,r);
 r=await vol.r('GET','/hampers/'+HamperID);ok('hamper detail',r.s===200&&r.j.records.length===2,r);const did=r.j.records[0].DistributionID;
 r=await vol.r('PUT','/distributions/'+did,{Quantity:8});ok('modify record',r.s===200,r);
 let st=await vol.r('GET','/inventory?q=Canned tomatoes');ok('stock reduced 120->112',st.j[0].QuantityOnHand===112,st.j[0]);
 r=await vol.r('DELETE','/distributions/'+did);ok('delete record',r.s===200,r);
 st=await vol.r('GET','/inventory?q=Canned tomatoes');ok('stock returned to 120',st.j[0].QuantityOnHand===120,st.j[0]);
 r=await vol.r('POST',`/hampers/${HamperID}/distributions`,{items:[{ItemID:1,Quantity:5}]});ok('re-add item',r.s===201,r);
 r=await vol.r('PATCH','/pickups/'+AppointmentID+'/status',{Status:'Delayed'});ok('mark delayed',r.s===200,r);
 r=await vol.r('PATCH','/pickups/'+AppointmentID+'/status',{Status:'Fulfilled'});ok('mark fulfilled',r.s===200,r);
 r=await vol.r('PATCH','/pickups/'+AppointmentID+'/status',{Status:'Missed'});ok('terminal state locked',r.s===409,r);
 r=await rec.r('GET','/my/distributions');ok('recipient history',r.s===200&&r.j.length>=4,r);
 r=await rec.r('GET','/my/distributions?from=2099-01-01');ok('recipient history date filter',r.s===200&&r.j.length===0,r);
 r=await vol.r('GET','/distributions?recipient=Riley');ok('volunteer search by recipient',r.s===200&&r.j.length>=4,r);
 r=await vol.r('GET','/distributions?recipient=Nobody');ok('volunteer search none',r.s===200&&r.j.length===0,r);
 // shifts
 r=await adm.r('POST','/volunteers/x');
 r=await adm.r('POST','/users/volunteers',{Name:'Vera',Email:'vera@x.ca',Phone:'5',Password:'abcdef',Availability:'Mon-Fri 09:00-17:00'});ok('create volunteer',r.s===201,r);const vera=r.j.user.UserID;
 r=await adm.r('POST','/users/volunteers',{Name:'Bad',Email:'bad@x.ca',Phone:'5',Password:'abcdef',Availability:'whenever'});ok('bad availability rejected',r.s===400,r);
 // next Monday 10-12 (available) and Sunday (not)
 const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));const ds=d.toISOString().slice(0,10);
 const sun=new Date();sun.setDate(sun.getDate()+((7-sun.getDay())%7||7));const ss=sun.toISOString().slice(0,10);
 r=await adm.r('POST','/shifts',{VolunteerID:vera,StartDateTime:ds+'T10:00',EndDateTime:ds+'T12:00',TaskDescription:'Sorting'});ok('assign shift within availability',r.s===201,r);const sid=r.j.shift.ShiftID;
 r=await adm.r('POST','/shifts',{VolunteerID:vera,StartDateTime:ds+'T11:00',EndDateTime:ds+'T13:00',TaskDescription:'Overlap'});ok('overlap blocked',r.s===409,r);
 r=await adm.r('POST','/shifts',{VolunteerID:vera,StartDateTime:ss+'T10:00',EndDateTime:ss+'T12:00',TaskDescription:'Sunday'});ok('unavailable day blocked',r.s===409,r);
 r=await adm.r('DELETE','/shifts/'+sid);ok('cancel shift',r.s===200,r);
 // own account
 r=await rec.r('PUT','/me',{HouseholdSize:5,Phone:'999'});ok('recipient modifies account',r.s===200&&r.j.user.HouseholdSize===5,r);
 r=await rec.r('PUT','/me',{Email:'admin@foodbank.ca'});ok('email dup on modify',r.s===409,r);
 // reports
 const now=new Date();
 r=await adm.r('GET',`/reports?type=donation&period=month&year=${now.getFullYear()}&month=${now.getMonth()+1}`);ok('donation report',r.s===200&&r.j.hampersDistributed>=1&&r.j.donations.length>0,r);
 r=await adm.r('GET',`/reports?type=waste&period=year&year=${now.getFullYear()}`);ok('waste report',r.s===200&&r.j.waste.length>0,r);
 r=await vol.r('GET','/reports?type=waste&period=year&year=2026');ok('volunteer cannot report',r.s===403);
 // alerts + delay monitor
 r=await adm.r('GET','/alerts/expiry');ok('expiry dashboard',r.s===200&&r.j[0].IV!==undefined,r);
 r=await adm.r('POST','/alerts/run');ok('run analyzer',r.s===200,r);
 r=await adm.r('GET','/alerts/log');ok('alert log',r.s===200&&r.j.length>0,r);
 // delete user
 r=await adm.r('DELETE','/users/'+vera);ok('archive user',r.s===200,r);
 r=await adm.r('DELETE','/users/1');ok('cannot delete self',r.s===400,r);
 console.log(fails?`\n${fails} of ${total} FAILED - see the arrows above`:`\nALL ${total} CHECKS PASSED - the pieces are connected`);process.exit(fails?1:0);
})();
