const KEY='smartAttendDataV1';
const todayISO=()=>new Date().toISOString().slice(0,10);
const STANDARD_DAY_MINUTES=8*60;
const STANDARD_MONTHLY_HOURS=160;
const sample=()=>({
 employees:[
  {id:'EMP-001',name:'Alex Morgan',dept:'Engineering',phone:'+971 50 111 2200',rate:28,status:'Active',bio:'Face + Fingerprint',workingHours:8,basicSalary:4200,allowance:800,monthlySalary:5000},
  {id:'EMP-002',name:'Sara Khan',dept:'Finance',phone:'+971 50 222 3300',rate:24,status:'Active',bio:'Fingerprint',workingHours:8,basicSalary:3000,allowance:700,monthlySalary:3700},
  {id:'EMP-003',name:'Omar Ali',dept:'Operations',phone:'+971 50 333 4400',rate:18,status:'Active',bio:'QR',workingHours:8,basicSalary:2600,allowance:600,monthlySalary:3200}
 ],
 departments:['Engineering','Finance','Operations','HR'],
 shifts:[
  {name:'Standard',start:'09:00',end:'17:00',grace:10,days:'Mon–Fri',status:'Active'},
  {name:'Flexible',start:'08:00',end:'16:00',grace:15,days:'Mon–Fri',status:'Active'}
 ],
 locations:[
  {name:'Main Office',address:'Abu Dhabi',lat:'',lng:'',status:'Active'},
  {name:'Remote / Field',address:'GPS required',lat:'',lng:'',status:'Active'}
 ],
 attendance:[
  {date:todayISO(),emp:'EMP-001',method:'QR',in:'08:57',out:'17:04',location:'Main Office',status:'Present'},
  {date:todayISO(),emp:'EMP-002',method:'Fingerprint',in:'09:13',out:'17:02',location:'Main Office',status:'Late'},
  {date:todayISO(),emp:'EMP-003',method:'Face',in:'09:01',out:'16:55',location:'Remote / Field',status:'Present'},
  {date:new Date(Date.now()-86400000).toISOString().slice(0,10),emp:'EMP-001',method:'QR',in:'09:02',out:'17:00',location:'Main Office',status:'Present'}
 ],
 leaves:[{emp:'EMP-002',type:'Annual',from:todayISO(),to:todayISO(),days:1,status:'Pending'}],
 audit:[{time:new Date().toLocaleString(),user:'Administrator',action:'System initialized',details:'SmartAttend demo data loaded'}]
});
let db=JSON.parse(localStorage.getItem(KEY)||'null')||sample();
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function toast(s){const t=document.getElementById('toast');t.textContent=s;t.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.style.display='none',2500)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m]))}
function money(n){const c=document.getElementById('currency')?.value||'USD';return new Intl.NumberFormat(undefined,{style:'currency',currency:c,maximumFractionDigits:2}).format(n)}
function emp(id){return db.employees.find(x=>x.id===id)}
function hours(r){let a=r.in.split(':').map(Number),b=r.out.split(':').map(Number);let x=a[0]*60+a[1],y=b[0]*60+b[1];if(y<x)y+=1440;return (y-x)/60}
function getEmployeeWorkingMinutes(employee){
  if(!employee) return STANDARD_DAY_MINUTES;
  const hours = Number(employee.workingHours ?? employee.workHours ?? STANDARD_DAY_MINUTES/60);
  const minutes = Number.isFinite(hours) && hours > 0 ? hours * 60 : STANDARD_DAY_MINUTES;
  return minutes;
}
function getSalaryBreakdown(employee){
  const baseMonthly = Number(employee.monthlySalary ?? employee.totalSalary ?? 0);
  const basic = Number(employee.basicSalary ?? (baseMonthly || (Number(employee.rate ?? 0) * STANDARD_MONTHLY_HOURS)));
  const allowance = Number(employee.allowance ?? Math.max(baseMonthly - basic, 0));
  const total = Number(employee.monthlySalary ?? employee.totalSalary ?? basic + allowance);
  return {basic, allowance, total, hourly: (basic / STANDARD_MONTHLY_HOURS)};
}
function getWorkedMinutes(record){
  if(!record?.in || !record?.out) return 0;
  const [inH,inM]=record.in.split(':').map(Number), [outH,outM]=record.out.split(':').map(Number);
  let minutes=(outH*60+outM)-(inH*60+inM);
  if(minutes < 0) minutes += 24*60;
  return minutes;
}
function isWeekend(dateStr){
  const date = new Date(`${dateStr}T12:00:00`);
  return date.getDay() === 0 || date.getDay() === 6;
}
function getRegularMinutes(record){
  const totalMinutes=getWorkedMinutes(record);
  if(!totalMinutes) return 0;
  const threshold = getEmployeeWorkingMinutes(emp(record.emp));
  if(isWeekend(record.date)) return 0;
  return Math.min(totalMinutes, threshold);
}
function getOvertimeMinutes(record){
  const totalMinutes=getWorkedMinutes(record);
  if(!totalMinutes) return 0;
  const threshold = getEmployeeWorkingMinutes(emp(record.emp));
  if(isWeekend(record.date)) return totalMinutes;
  return Math.max(totalMinutes - threshold, 0);
}
function getEmployeeBaseRate(record){
  const employee = emp(record.emp);
  return employee ? getSalaryBreakdown(employee).hourly : 0;
}
function getSalaryStatusLabel(delta){
  if(delta > 0) return '+ over salary';
  if(delta < 0) return '- over salary';
  return 'On target';
}
function getSalaryStatusText(delta){
  if(delta > 0) return `+ over salary ${money(delta)}`;
  if(delta < 0) return `- over salary ${money(Math.abs(delta))}`;
  return 'On target';
}
function getRegularPay(record){
  const employee = emp(record.emp);
  if(!employee) return 0;
  const baseRate = getSalaryBreakdown(employee).hourly;
  return (getRegularMinutes(record) / 60) * baseRate;
}
function getOvertimePay(record){
  const employee = emp(record.emp);
  if(!employee) return 0;
  const overtimeMinutes=getOvertimeMinutes(record);
  if(!overtimeMinutes) return 0;
  const baseRate = getSalaryBreakdown(employee).hourly;
  const multiplier = isWeekend(record.date) ? 2 : 1.5;
  return (overtimeMinutes / 60) * baseRate * multiplier;
}
function getEmployeeMonthlySummary(employee, monthPattern = todayISO().slice(0,7)){
  const salary = getSalaryBreakdown(employee);
  const monthRecords = db.attendance.filter(a => a.emp === employee.id && a.date.startsWith(monthPattern));
  const totalOTMinutes = monthRecords.reduce((sum, record) => sum + getOvertimeMinutes(record), 0);
  const totalOTPay = monthRecords.reduce((sum, record) => sum + getOvertimePay(record), 0);
  const totalPay = salary.total + totalOTPay;
  const delta = totalPay - salary.total;
  return {
    salary,
    totalOTMinutes,
    totalOTPay,
    totalPay,
    delta,
    status: getSalaryStatusLabel(delta),
    monthRecords
  };
}
function rate(r){return getEmployeeBaseRate(r)}
function pay(r){return getRegularPay(r)+getOvertimePay(r)}
function addAudit(action,details){db.audit.unshift({time:new Date().toLocaleString(),user:'Administrator',action,details});db.audit=db.audit.slice(0,100)}
function go(page){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+page).classList.add('active');document.querySelectorAll('.nav a').forEach(x=>x.classList.toggle('active',x.dataset.page===page));document.title='SmartAttend — '+page[0].toUpperCase()+page.slice(1);renderAll();if(innerWidth<761)document.getElementById('sidebar').classList.remove('open')}
document.querySelectorAll('.nav a').forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.page)});
document.getElementById('hamb').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
document.getElementById('globalSearch').oninput=e=>{const q=e.target.value.toLowerCase();if(q){go('employees');document.getElementById('empSearch').value=q;renderEmployees()}};

function openModal(id){
 fillSelects();
 if(id==='employeeModal'){
  document.getElementById('employeeModalTitle').textContent='Add Employee';
  document.getElementById('employeeModal').querySelector('form').reset();
  document.getElementById('eId').disabled=false;
  document.getElementById('eRate').value=15;
  document.getElementById('eWork').value=8;
  document.getElementById('eBasic').value=2500;
  document.getElementById('eAllowance').value=500;
  document.getElementById('eMonthly').value=3000;
 }
 document.getElementById(id).classList.add('show')
}
function editEmployee(id){
 const employee=emp(id);
 if(!employee) return;
 fillSelects();
 document.getElementById('employeeModalTitle').textContent='Edit Employee';
 document.getElementById('eId').value=employee.id;
 document.getElementById('eId').disabled=true;
 document.getElementById('eName').value=employee.name||'';
 document.getElementById('eDept').value=employee.dept||'';
 document.getElementById('ePhone').value=employee.phone||'';
 document.getElementById('eRate').value=employee.rate??0;
 document.getElementById('eWork').value=employee.workingHours??employee.workHours??8;
 document.getElementById('eBasic').value=employee.basicSalary??0;
 document.getElementById('eAllowance').value=employee.allowance??0;
 document.getElementById('eMonthly').value=employee.monthlySalary??0;
 document.getElementById('eStatus').value=employee.status||'Active';
 document.getElementById('employeeModal').classList.add('show');
}
function closeModal(id){document.getElementById(id).classList.remove('show')}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));

function fillSelects(){
 const ds=['<option value="">Select department</option>',...db.departments.map(d=>`<option>${esc(d)}</option>`)].join('');
 ['eDept'].forEach(id=>document.getElementById(id).innerHTML=ds);
 document.getElementById('empDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 document.getElementById('payDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 const es=db.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('');
 ['aEmp','lvEmp'].forEach(id=>document.getElementById(id).innerHTML=es);
}
function renderDashboard(){
 document.getElementById('statEmployees').textContent=db.employees.filter(e=>e.status==='Active').length;
 const td=db.attendance.filter(a=>a.date===todayISO()), present=td.filter(a=>['Present','Late'].includes(a.status)).length;
 document.getElementById('statPresent').textContent=present;document.getElementById('presentRate').textContent=db.employees.length?Math.round(present/db.employees.length*100)+'%':'0%';
 document.getElementById('statLate').textContent=td.filter(a=>a.status==='Late').length;
 document.getElementById('statPayroll').textContent=money(td.reduce((s,a)=>s+pay(a),0));
 const salarySummary = db.employees.reduce((acc, employee) => {
   const summary = getEmployeeMonthlySummary(employee, todayISO().slice(0,7));
   acc.basic += summary.salary.basic;
   acc.allowance += summary.salary.allowance;
   acc.salary += summary.salary.total;
   acc.otPay += summary.totalOTPay;
   acc.totalPay += summary.totalPay;
   return acc;
 }, {basic:0, allowance:0, salary:0, otPay:0, totalPay:0});
 const delta = salarySummary.totalPay - salarySummary.salary;
 document.getElementById('salarySummaryCard').innerHTML = `
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Basic</small><h3>${money(salarySummary.basic)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Allowance</small><h3>${money(salarySummary.allowance)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Monthly Salary</small><h3>${money(salarySummary.salary)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Total OT</small><h3>${money(salarySummary.otPay)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Total Pay</small><h3>${money(salarySummary.totalPay)}</h3></div></div>
    <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Status</small><h3 style="color:${delta >= 0 ? 'var(--success)' : 'var(--danger)'}">${getSalaryStatusText(delta)}</h3></div></div>
   </div>
   <div style="margin-top:12px;color:var(--muted);font-size:12px;">Formula: Basic + Allowance + OT = Total Pay</div>
 `;
 const c=document.getElementById('weeklyChart');c.innerHTML='';
 for(let i=6;i>=0;i--){let d=new Date(Date.now()-i*86400000),iso=d.toISOString().slice(0,10),n=db.attendance.filter(a=>a.date===iso&&a.status!=='Absent').length,max=Math.max(1,db.employees.length);let h=Math.max(8,Math.min(95,n/max*95));c.innerHTML+=`<div class="bar-wrap"><div class="bar" style="height:${h}%"></div><div class="bar alt" style="height:${Math.max(4,h*.75)}%"></div><div class="bar-label">${d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)}</div></div>`}
 document.getElementById('recentActivity').innerHTML=db.attendance.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(a=>`<div class="activity-row"><span class="dot"></span><div><b>${esc(emp(a.emp)?.name||a.emp)}</b><div style="font-size:11px;color:#6b7280">${esc(a.method)} check-in • ${esc(a.location)}</div></div><small>${esc(a.in)}</small></div>`).join('')||'<div class="empty">No activity</div>';
}
function renderAttendance(){
 const q=(document.getElementById('attSearch').value||'').toLowerCase(),date=document.getElementById('attDate').value,status=document.getElementById('attStatus').value;
 let rows=db.attendance.filter(a=>(!q||(emp(a.emp)?.name||'').toLowerCase().includes(q)||a.emp.toLowerCase().includes(q))&&(!date||a.date===date)&&(!status||a.status===status));
 document.getElementById('attendanceBody').innerHTML=rows.map(a=>`<tr><td>${esc(a.date)}</td><td><b>${esc(emp(a.emp)?.name||a.emp)}</b><br><small>${esc(a.emp)}</small></td><td>${esc(a.method)}</td><td>${esc(a.in)}</td><td>${esc(a.out)}</td><td>${hours(a).toFixed(2)}</td><td>${(getOvertimeMinutes(a)/60).toFixed(2)}</td><td>${money(rate(a))}</td><td><b>${money(pay(a))}</b></td><td>${esc(a.location||'—')}</td><td><span class="badge ${a.status.toLowerCase()}">${esc(a.status)}</span></td></tr>`).join('')||'<tr><td colspan="11" class="empty">No records match the selected filters.</td></tr>';
}
function renderEmployees(){
 const q=(document.getElementById('empSearch').value||'').toLowerCase(),d=document.getElementById('empDept').value;
 document.getElementById('employeesBody').innerHTML=db.employees.filter(e=>(!q||[e.id,e.name,e.dept,e.phone].join(' ').toLowerCase().includes(q))&&(!d||e.dept===d)).map(e=>{
  const salary=getSalaryBreakdown(e);
  return `<tr><td>${esc(e.id)}</td><td><b>${esc(e.name)}</b></td><td>${esc(e.dept)}</td><td>${esc(e.phone)}</td><td>${Number(e.workingHours ?? e.workHours ?? 8).toFixed(1)} hrs</td><td>${money(salary.total)}</td><td><button class="btn" onclick="editEmployee('${esc(e.id)}')">Edit</button> <button class="btn" onclick="removeEmployee('${esc(e.id)}')">Delete</button></td></tr>`;
 }).join('')||'<tr><td colspan="7" class="empty">No employees found.</td></tr>';
}
function renderDepartments(){document.getElementById('departmentCards').innerHTML=db.departments.map(d=>{let n=db.employees.filter(e=>e.dept===d).length;return `<div class="card"><div class="stat"><div><small>Department</small><h2 style="font-size:19px">${esc(d)}</h2><span style="color:var(--muted);font-size:12px">${n} employee${n===1?'':'s'}</span></div><div class="stat-icon">▤</div></div></div>`}).join('')}
function renderShifts(){document.getElementById('shiftsBody').innerHTML=db.shifts.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.start)}</td><td>${esc(s.end)}</td><td>${esc(s.grace)} min</td><td>${esc(s.days)}</td><td><span class="badge present">${esc(s.status)}</span></td></tr>`).join('')}
function renderPayroll(){
 let month=document.getElementById('payMonth').value||todayISO().slice(0,7),dept=document.getElementById('payDept').value;
 document.getElementById('payrollBody').innerHTML=db.employees.filter(e=>!dept||e.dept===dept).map(e=>{
  const salary=getSalaryBreakdown(e);
  const rs=db.attendance.filter(a=>a.emp===e.id && a.date.startsWith(month));
  const otHours=(rs.reduce((s,a)=>s+getOvertimeMinutes(a),0)/60).toFixed(2);
  const otPay=rs.reduce((s,a)=>s+getOvertimePay(a),0);
  const totalPay = salary.total + otPay;
  const status = getSalaryStatusText(totalPay - salary.total);
  return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.dept)}</td><td>${money(salary.basic)}</td><td>${money(salary.allowance)}</td><td><b>${money(salary.total)}</b></td><td>${otHours}h</td><td>${money(otPay)}</td><td><b>${money(totalPay)}</b></td><td><span class="badge ${totalPay >= salary.total ? 'present' : 'absent'}">${esc(status)}</span></td></tr>`}).join('')||'<tr><td colspan="9" class="empty">No payroll rows available.</td></tr>';
}
function renderLocations(){document.getElementById('locationCards').innerHTML=db.locations.map(l=>`<div class="card"><div class="stat"><div><small>Attendance site</small><h2 style="font-size:18px">${esc(l.name)}</h2><span style="font-size:12px;color:var(--muted)">${esc(l.address)}</span></div><div class="stat-icon">⌖</div></div><div style="margin-top:14px;font-size:11px;color:var(--muted)">GPS: ${l.lat&&l.lng?esc(l.lat)+', '+esc(l.lng):'Not fixed'} • <span style="color:var(--success)">Active</span></div></div>`).join('')}
function renderLeaves(){document.getElementById('leaveBody').innerHTML=db.leaves.map((l,i)=>`<tr><td>${esc(emp(l.emp)?.name||l.emp)}</td><td>${esc(l.type)}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td><td>${esc(l.days)}</td><td><span class="badge ${l.status==='Approved'?'present':l.status==='Rejected'?'absent':'leave'}">${esc(l.status)}</span></td><td>${l.status==='Pending'?`<button class="btn success" onclick="approveLeave(${i})">Approve</button> <button class="btn danger" onclick="rejectLeave(${i})">Reject</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No leave requests.</td></tr>'}
function renderAudit(){document.getElementById('auditBody').innerHTML=db.audit.map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td><td>${esc(x.details)}</td></tr>`).join('')}
function renderReports(){document.getElementById('reportRecords').textContent=db.attendance.length;document.getElementById('reportHours').textContent=db.attendance.reduce((s,a)=>s+hours(a),0).toFixed(1);document.getElementById('reportPay').textContent=money(db.attendance.reduce((s,a)=>s+pay(a),0));document.getElementById('reportLocations').textContent=new Set(db.attendance.map(a=>a.location).filter(Boolean)).size}
function renderAll(){fillSelects();renderDashboard();renderAttendance();renderEmployees();renderDepartments();renderShifts();renderPayroll();renderLocations();renderLeaves();renderAudit();renderReports()}
function addEmployee(e){e.preventDefault();
  const form = e.target;
  const id = (document.getElementById('eId')?.value || '').trim();
  const name = (document.getElementById('eName')?.value || '').trim();
  const dept = document.getElementById('eDept')?.value || 'General';
  const phone = (document.getElementById('ePhone')?.value || '').trim();
  const rate = Number(document.getElementById('eRate')?.value || 0);
  const workingHours = Number(document.getElementById('eWork')?.value || 8);
  const basicSalary = Number(document.getElementById('eBasic')?.value || 0);
  const allowance = Number(document.getElementById('eAllowance')?.value || 0);
  const monthlySalary = Number(document.getElementById('eMonthly')?.value || basicSalary + allowance);
  const status = document.getElementById('eStatus')?.value || 'Active';
  if(!id || !name){toast('Employee ID and name are required');return}
  const existing=emp(id);
  if(existing){
   Object.assign(existing,{name,dept,phone,rate,status,workingHours,workHours:workingHours,basicSalary:basicSalary||0,allowance,monthlySalary:monthlySalary || basicSalary + allowance});
   addAudit('Employee updated',name);
  }else{
   const x={id,name,dept,phone,rate,status,bio:'Not enrolled',workingHours,workHours:workingHours,basicSalary:basicSalary||0,allowance,monthlySalary:monthlySalary || basicSalary + allowance};
   db.employees.push(x);
   addAudit('Employee added',name);
  }
  save();closeModal('employeeModal');form.reset();document.getElementById('eId').disabled=false;renderAll();toast(existing?'Employee updated':'Employee saved')
}
function removeEmployee(id){if(confirm('Delete this employee?')){let x=emp(id);db.employees=db.employees.filter(e=>e.id!==id);db.attendance=db.attendance.filter(a=>a.emp!==id);addAudit('Employee deleted',x?.name||id);save();renderAll();toast('Employee deleted')}}
function addAttendance(e){e.preventDefault();let x={date:aDate.value,emp:aEmp.value,method:aMethod.value,in:aIn.value,out:aOut.value,location:aLocation.value||'Unspecified',status:aStatus.value};db.attendance.push(x);addAudit('Attendance added',`${emp(x.emp)?.name||x.emp} — ${x.date} — ${x.method}`);save();closeModal('attendanceModal');renderAll();toast('Attendance saved')}
function addDepartment(e){e.preventDefault();let n=dName.value.trim();if(!db.departments.includes(n))db.departments.push(n);addAudit('Department added',n);save();closeModal('departmentModal');e.target.reset();renderAll();toast('Department saved')}
function addShift(e){e.preventDefault();db.shifts.push({name:sName.value,start:sStart.value,end:sEnd.value,grace:+sGrace.value,days:'Mon–Fri',status:'Active'});addAudit('Shift added',sName.value);save();closeModal('shiftModal');e.target.reset();renderAll();toast('Shift saved')}
function addLocation(e){e.preventDefault();db.locations.push({name:lName.value,address:lAddress.value,lat:lLat.value,lng:lLng.value,status:'Active'});addAudit('Location added',lName.value);save();closeModal('locationModal');e.target.reset();renderAll();toast('Location saved')}
function addLeave(e){e.preventDefault();let f=new Date(lvFrom.value),t=new Date(lvTo.value);if(t<f){toast('End date must be after start date');return}let days=Math.floor((t-f)/86400000)+1;db.leaves.push({emp:lvEmp.value,type:lvType.value,from:lvFrom.value,to:lvTo.value,days,status:'Pending'});addAudit('Leave requested',emp(lvEmp.value)?.name||lvEmp.value);save();closeModal('leaveModal');renderAll();toast('Leave request submitted')}
function approveLeave(i){db.leaves[i].status='Approved';addAudit('Leave approved',emp(db.leaves[i].emp)?.name||db.leaves[i].emp);save();renderAll();toast('Leave approved')}
function rejectLeave(i){db.leaves[i].status='Rejected';addAudit('Leave rejected',emp(db.leaves[i].emp)?.name||db.leaves[i].emp);save();renderAll();toast('Leave rejected')}
function clearAudit(){if(confirm('Clear audit log?')){db.audit=[];save();renderAudit();toast('Audit log cleared')}}
function clearFilters(){attSearch.value='';attDate.value='';attStatus.value='';renderAttendance()}
function printTable(id){let el=document.getElementById(id);if(!el){toast('Table not available');return}let w=window.open('','_blank');w.document.write(`<html><head><title>SmartAttend Report</title><style>body{font-family:Arial;padding:25px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:11px}th{background:#f4f4f4}h2{margin-bottom:15px}</style></head><body><h2>SmartAttend Report</h2>${el.outerHTML}<script>window.print();<\/script></body></html>`);w.document.close()}
async function startQR(){
 const video=document.getElementById('scannerVideo'),res=document.getElementById('scanResult');
 if(!document.getElementById('setQR').checked){toast('QR attendance is disabled in Settings');return}
 try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.srcObject=stream;video.style.display='block';
 if('BarcodeDetector' in window){const detector=new BarcodeDetector({formats:['qr_code']});res.style.display='block';res.textContent='Camera active — point it at an employee QR code.';const loop=async()=>{if(video.style.display==='none')return;try{const codes=await detector.detect(video);if(codes.length){let val=codes[0].rawValue;recordScan('QR',val);stopCamera();return}}catch{}requestAnimationFrame(loop)};loop()}else{res.style.display='block';res.textContent='Camera active. This browser does not expose BarcodeDetector; enter the QR employee ID using the prompt.';let id=prompt('Enter employee ID encoded in the QR code (e.g. EMP-001):');if(id){recordScan('QR',id);stopCamera()}}}catch(err){toast('Camera permission is unavailable or denied')}
}
function startFace(){if(!document.getElementById('setBio').checked){toast('Biometric attendance is disabled');return}const video=document.getElementById('scannerVideo'),res=document.getElementById('scanResult');navigator.mediaDevices?.getUserMedia({video:true}).then(stream=>{video.srcObject=stream;video.style.display='block';res.style.display='block';res.textContent='Camera active. This front-end captures the camera feed; true face identity matching requires a secure biometric model/backend.'}).catch(()=>toast('Camera permission is unavailable or denied'))}
async function startFingerprint(){if(!document.getElementById('setBio').checked){toast('Biometric attendance is disabled');return}if(!window.PublicKeyCredential){toast('WebAuthn is not supported by this browser');return}try{if(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && !(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())){toast('No platform biometric authenticator is available');return}toast('A production deployment should first register a WebAuthn credential for this employee/device.');let id=prompt('Enter employee ID to log a demo fingerprint sign-in:');if(id&&emp(id)){recordScan('Fingerprint',id)}}catch(err){toast('Fingerprint/WebAuthn operation could not be started')}}
function recordScan(method,id){let x=emp(id.trim());if(!x){toast('Employee ID not found');return}let now=new Date(),inTime=now.toTimeString().slice(0,5);db.attendance.push({date:todayISO(),emp:x.id,method,in:inTime,out:inTime,location:'Scanner — GPS pending',status:'Present'});addAudit('Attendance scanned',`${x.name} — ${method}`);save();renderAll();toast(`${method} sign-in recorded for ${x.name}`)}
function stopCamera(){const v=document.getElementById('scannerVideo');if(v.srcObject)v.srcObject.getTracks().forEach(t=>t.stop());v.srcObject=null;v.style.display='none'}
function saveSettings(){save();toast('Settings saved')}
document.getElementById('aDate').value=todayISO();document.getElementById('attDate').value='';
renderAll();
