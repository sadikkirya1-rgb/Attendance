const KEY='smartAttendDataV1';
const todayISO=()=>new Date().toISOString().slice(0,10);
const STANDARD_DAY_MINUTES=8*60;
const STANDARD_MONTHLY_HOURS=160;
const sample=()=>({
 employees:[
  {id:'EMP-001',name:'Alex Morgan',dept:'Engineering',email:'alex.morgan@company.com',location:'Main Office',phone:'+971 50 111 2200',rate:28,status:'Active',bio:'Face + Fingerprint',workingHours:8,startTime:'09:00',endTime:'17:00',basicSalary:4200,allowance:800,monthlySalary:5000},
  {id:'EMP-002',name:'Sara Khan',dept:'Finance',email:'sara.khan@company.com',location:'Main Office',phone:'+971 50 222 3300',rate:24,status:'Active',bio:'Fingerprint',workingHours:8,startTime:'09:00',endTime:'17:00',basicSalary:3000,allowance:700,monthlySalary:3700},
  {id:'EMP-003',name:'Omar Ali',dept:'Operations',email:'omar.ali@company.com',location:'Remote / Field',phone:'+971 50 333 4400',rate:18,status:'Active',bio:'QR',workingHours:8,startTime:'09:00',endTime:'17:00',basicSalary:2600,allowance:600,monthlySalary:3200}
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
  audit:[{time:new Date().toLocaleString(undefined,{hour12:true}),user:'Administrator',action:'System initialized',details:'SmartAttend demo data loaded'}]
});
let db=JSON.parse(localStorage.getItem(KEY)||'null')||sample();
db.settings={timeMode:db.settings?.timeMode||'12',workingDays:Number(db.settings?.workingDays)||5};
const currentMonth=()=>todayISO().slice(0,7);
const nowLabel=()=>new Date().toLocaleString(undefined,{hour12:true});
if(!db.manager){
 db.manager={
  exceptionRequests:[{id:'EX-001',type:'Late arrival',emp:'EMP-002',date:todayISO(),reason:'Arrival was recorded after the scheduled start time.',status:'Pending'}],
  overtimeRequests:[{id:'OT-001',emp:'EMP-001',date:todayISO(),hours:1.12,reason:'Project support after scheduled hours.',status:'Pending'}],
  payrollPeriods:{},
  notifications:[{id:'NT-001',title:'Payroll review ready',body:'The current pay period is ready for manager review.',time:nowLabel(),read:false}]
 };
}
db.manager.exceptionRequests=db.manager.exceptionRequests||[];
db.manager.overtimeRequests=db.manager.overtimeRequests||[];
db.manager.correctionRequests=db.manager.correctionRequests||[];
db.manager.payrollPeriods=db.manager.payrollPeriods||{};
db.manager.payrollPeriods[currentMonth()]=db.manager.payrollPeriods[currentMonth()]||{status:'Open'};
db.manager.notifications=db.manager.notifications||[];
db.leaveBalances=db.leaveBalances||{};
db.employees.forEach(employee=>{db.leaveBalances[employee.id]=db.leaveBalances[employee.id]||{Annual:20,Sick:10,Personal:5}});
db.holidays=db.holidays||[];
let currentRole='admin';
const selectedEmployeeIds=new Set();
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function toast(s){const t=document.getElementById('toast');t.textContent=s;t.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.style.display='none',2500)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m]))}
function money(n){const c=document.getElementById('currency')?.value||'USD';return new Intl.NumberFormat(undefined,{style:'currency',currency:c,maximumFractionDigits:2}).format(n)}
function emp(id){return db.employees.find(x=>x.id===id)}
function timeMode(){return db.settings?.timeMode==='24'?'24':'12'}
function formatTime(value){
 if(!value) return '—';
 const [hour,minute]=value.split(':').map(Number);
 if(timeMode()==='24') return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
 const suffix=hour>=12?'PM':'AM';
 const displayHour=hour%12||12;
 return `${displayHour}:${String(minute).padStart(2,'0')} ${suffix}`;
}
function datePresetRange(preset,from='',to=''){
 if(preset==='today')return {from:todayISO(),to:todayISO()};
 if(preset==='yesterday'){const date=new Date();date.setDate(date.getDate()-1);const value=date.toISOString().slice(0,10);return {from:value,to:value}}
 if(preset==='7days'){const end=new Date();const start=new Date();start.setDate(end.getDate()-6);return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)}}
 if(preset==='30days'){const end=new Date();const start=new Date();start.setDate(end.getDate()-29);return {from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)}}
 if(preset==='custom')return {from:from||'',to:to||from||''};
 return {from:'',to:''};
}
function matchesDatePreset(dateValue,preset,from='',to=''){
 const range=datePresetRange(preset,from,to);
 return (!range.from||dateValue>=range.from)&&(!range.to||dateValue<=range.to);
}
function toggleDateInput(presetId,rangeId){const preset=document.getElementById(presetId).value;const range=document.getElementById(rangeId);range.hidden=preset!=='custom';if(preset==='custom'){const inputs=range.querySelectorAll('input');if(!inputs[0].value)inputs[0].value=todayISO();if(!inputs[1].value)inputs[1].value=inputs[0].value}}
function syncDatePresetButtons(presetId){const value=document.getElementById(presetId).value;document.querySelectorAll(`[data-preset-target="${presetId}"] .preset-btn`).forEach(button=>button.classList.toggle('active',button.dataset.preset===value))}
function setDatePreset(presetId,rangeId,value){const preset=document.getElementById(presetId);if(!preset)return;preset.value=value;toggleDateInput(presetId,rangeId);const renderer={dashboardDatePreset:renderDashboard,attDatePreset:renderAttendance,payDatePreset:renderPayroll,leaveDatePreset:renderLeaves}[presetId];if(typeof renderer==='function')renderer();syncDatePresetButtons(presetId)}
document.querySelectorAll('.date-presets').forEach(group=>{const presetId=group.dataset.presetTarget,rangeId=presetId.replace('DatePreset','DateRange');group.querySelectorAll('.preset-btn').forEach(button=>button.onclick=()=>setDatePreset(presetId,rangeId,button.dataset.preset))});
function hours(r){let a=r.in.split(':').map(Number),b=r.out.split(':').map(Number);let x=a[0]*60+a[1],y=b[0]*60+b[1];if(y<x)y+=1440;return (y-x)/60}
function getMonthlyHours(employee){
 const workDays=Math.max(1,Math.min(7,Number(db.settings?.workingDays)||5));
 const dailyHours=Number(employee?.workingHours)||8;
 return workDays*52/12*dailyHours;
}
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
  return {basic, allowance, total, hourly: (basic / getMonthlyHours(employee))};
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
function getSalaryDeltaText(delta){
  if(delta > 0) return `+${money(delta)}`;
  if(delta < 0) return `-${money(Math.abs(delta))}`;
  return money(0);
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
  const leave = getLeavePayroll(employee, monthPattern);
  const bonus = Number(employee.monthlyBonus ?? employee.bonus ?? 0);
  const deduction = Number(employee.monthlyDeduction ?? employee.deduction ?? 0);
  const totalPay = salary.total + totalOTPay - leave.unpaidDeduction + bonus - deduction;
  const delta = totalPay - salary.total;
  return {
    salary,
    totalOTMinutes,
    totalOTPay,
    leave,
    bonus,
    deduction,
    totalPay,
    delta,
    status: getSalaryStatusLabel(delta),
    monthRecords
  };
}
function getLeavePayroll(employee, monthPattern = todayISO().slice(0,7)){
 const monthlyWorkingDays=Math.max(1,Number(db.settings?.workingDays)||5)*52/12;
 const dailyRate=getSalaryBreakdown(employee).total/monthlyWorkingDays;
 const approved=db.leaves.filter(leave=>leave.emp===employee.id&&leave.status==='Approved'&&leave.from.startsWith(monthPattern));
 const paidLeaveDays=approved.filter(leave=>['Annual','Sick','Personal'].includes(leave.type)).reduce((sum,leave)=>sum+Number(leave.days||0),0);
 const unpaidLeaveDays=approved.filter(leave=>leave.type==='Unpaid').reduce((sum,leave)=>sum+Number(leave.days||0),0);
 return {dailyRate,paidLeaveDays,unpaidLeaveDays,paidLeaveSalary:paidLeaveDays*dailyRate,unpaidDeduction:unpaidLeaveDays*dailyRate};
}
function rate(r){return getEmployeeBaseRate(r)}
function pay(r){return getRegularPay(r)+getOvertimePay(r)}
function addAudit(action,details){db.audit.unshift({time:new Date().toLocaleString(undefined,{hour12:true}),user:'Administrator',action,details});db.audit=db.audit.slice(0,100)}
const rolePages={admin:['dashboard','manager','approvals','selfservice','attendance','employees','departments','shifts','scanner','payroll','locations','leaves','reports','audit','settings'],manager:['dashboard','manager','approvals','selfservice','attendance','employees','shifts','locations','leaves','reports'],payroll:['dashboard','manager','approvals','selfservice','attendance','payroll','reports'],employee:['selfservice']};
function canPerform(roles){if(roles.includes(currentRole))return true;toast('You do not have permission for this action');return false}
function applyRolePermissions(){document.querySelectorAll('.nav a[data-page]').forEach(link=>{link.style.display=rolePages[currentRole].includes(link.dataset.page)?'flex':'none'});document.querySelectorAll('[data-roles]').forEach(control=>{control.style.display=control.dataset.roles.split(',').includes(currentRole)?'':'none'});if(document.getElementById('roleSwitcher'))document.getElementById('roleSwitcher').value=currentRole}
function go(page){if(!rolePages[currentRole].includes(page))page=currentRole==='employee'?'selfservice':currentRole==='payroll'?'payroll':currentRole==='manager'?'manager':'dashboard';document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+page).classList.add('active');document.querySelectorAll('.nav a').forEach(x=>x.classList.toggle('active',x.dataset.page===page));document.title='SmartAttend — '+page[0].toUpperCase()+page.slice(1);renderAll();applyRolePermissions();if(innerWidth<761)document.getElementById('sidebar').classList.remove('open')}
document.querySelectorAll('.nav a').forEach(a=>a.onclick=e=>{e.preventDefault();go(a.dataset.page)});
document.getElementById('hamb').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
document.getElementById('globalSearch').oninput=e=>{const q=e.target.value.toLowerCase();if(q){go('employees');document.getElementById('empSearch').value=q;renderEmployees()}};

function openModal(id){
 fillSelects();
 if(id==='employeeModal'){
  document.getElementById('employeeModalTitle').textContent='Add Employee';
  document.getElementById('employeeModal').querySelector('form').reset();
  document.getElementById('eId').disabled=false;
  document.getElementById('eEmail').value='';
  document.getElementById('eLocation').value='Main Office';
  document.getElementById('eRate').value=15;
  document.getElementById('eWork').value=8;
  document.getElementById('eStart').value='09:00';
  document.getElementById('eEnd').value='17:00';
  document.getElementById('eBasic').value=2500;
  document.getElementById('eAllowance').value=500;
  document.getElementById('eMonthly').value=3000;
  document.getElementById('eBonus').value=0;
  document.getElementById('eDeduction').value=0;
 }
 if(id==='correctionModal'){
  document.getElementById('correctionModal').querySelector('form').reset();
  document.getElementById('cDate').value=todayISO();
 }
 document.getElementById(id).classList.add('show')
}
function editEmployee(id){
 if(!canPerform(['admin','manager']))return;
 const employee=emp(id);
 if(!employee) return;
 fillSelects();
 document.getElementById('employeeModalTitle').textContent='Edit Employee';
 document.getElementById('eId').value=employee.id;
 document.getElementById('eId').disabled=true;
 document.getElementById('eName').value=employee.name||'';
 document.getElementById('eDept').value=employee.dept||'';
 document.getElementById('eEmail').value=employee.email||'';
 document.getElementById('eLocation').value=employee.location||'Main Office';
 document.getElementById('ePhone').value=employee.phone||'';
 document.getElementById('eRate').value=employee.rate??0;
 document.getElementById('eWork').value=employee.workingHours??employee.workHours??8;
 document.getElementById('eStart').value=employee.startTime||'09:00';
 document.getElementById('eEnd').value=employee.endTime||'17:00';
 document.getElementById('eBasic').value=employee.basicSalary??0;
 document.getElementById('eAllowance').value=employee.allowance??0;
 document.getElementById('eMonthly').value=employee.monthlySalary??0;
 document.getElementById('eBonus').value=employee.monthlyBonus??employee.bonus??0;
 document.getElementById('eDeduction').value=employee.monthlyDeduction??employee.deduction??0;
 document.getElementById('eStatus').value=employee.status||'Active';
 document.getElementById('employeeModal').classList.add('show');
}
function closeModal(id){document.getElementById(id).classList.remove('show')}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));

function fillSelects(){
 const selectedEmpDept=document.getElementById('empDept').value,selectedPayDept=document.getElementById('payDept').value,selectedDashboardDept=document.getElementById('dashboardDept').value,selectedReportDept=document.getElementById('reportDept').value;
 const ds=['<option value="">Select department</option>',...db.departments.map(d=>`<option>${esc(d)}</option>`)].join('');
 ['eDept'].forEach(id=>document.getElementById(id).innerHTML=ds);
 document.getElementById('empDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 document.getElementById('payDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 document.getElementById('dashboardDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 document.getElementById('reportDept').innerHTML='<option value="">All departments</option>'+db.departments.map(d=>`<option>${esc(d)}</option>`).join('');
 document.getElementById('empDept').value=selectedEmpDept;document.getElementById('payDept').value=selectedPayDept;document.getElementById('dashboardDept').value=selectedDashboardDept;document.getElementById('reportDept').value=selectedReportDept;
 const es=db.employees.map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('');
 ['aEmp','lvEmp','selfEmployee','cEmp'].forEach(id=>document.getElementById(id).innerHTML=es);
 document.getElementById('timeMode').value=timeMode();
 document.getElementById('workingDays').value=Number(db.settings?.workingDays)||5;
}
function renderDashboard(){
 const dashboardPreset=document.getElementById('dashboardDatePreset').value,dashboardFrom=document.getElementById('dashboardDateFrom').value,dashboardTo=document.getElementById('dashboardDateTo').value,dashboardRange=datePresetRange(dashboardPreset,dashboardFrom,dashboardTo),dashboardDate=dashboardRange.from||todayISO(),dashboardDept=document.getElementById('dashboardDept').value;
 const visibleEmployees=db.employees.filter(e=>e.status==='Active'&&(!dashboardDept||e.dept===dashboardDept));
 const td=db.attendance.filter(a=>matchesDatePreset(a.date,dashboardPreset,dashboardFrom,dashboardTo)&&(!dashboardDept||emp(a.emp)?.dept===dashboardDept)), present=td.filter(a=>['Present','Late'].includes(a.status)).length;
 const filteredEmployees=visibleEmployees.filter(employee=>td.some(record=>record.emp===employee.id));
 document.getElementById('statEmployees').textContent=filteredEmployees.length;
 document.getElementById('statPresent').textContent=present;document.getElementById('presentRate').textContent=filteredEmployees.length?Math.round(present/filteredEmployees.length*100)+'%':'0%';
 document.getElementById('statLate').textContent=td.filter(a=>a.status==='Late').length;
 document.getElementById('statPayroll').textContent=money(td.reduce((s,a)=>s+pay(a),0));
 const salarySummary = visibleEmployees.reduce((acc, employee) => {
   const summary = getEmployeeMonthlySummary(employee, todayISO().slice(0,7));
   acc.basic += summary.salary.basic;
   acc.allowance += summary.salary.allowance;
   acc.salary += summary.salary.total;
   acc.otPay += summary.totalOTPay;
  acc.totalPay += summary.totalPay;
  acc.leavePay += summary.leave.paidLeaveSalary;
  acc.leaveDeduction += summary.leave.unpaidDeduction;
   return acc;
 }, {basic:0, allowance:0, salary:0, otPay:0, leavePay:0, leaveDeduction:0, totalPay:0});
 const delta = salarySummary.totalPay - salarySummary.salary;
 document.getElementById('salarySummaryCard').innerHTML = `
   <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Basic</small><h3>${money(salarySummary.basic)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Allowance</small><h3>${money(salarySummary.allowance)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Monthly Salary</small><h3>${money(salarySummary.salary)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Total OT</small><h3>${money(salarySummary.otPay)}</h3></div></div>
     <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Total Pay</small><h3>${money(salarySummary.totalPay)}</h3></div></div>
    <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Leave adjustment</small><h3>${money(salarySummary.leavePay-salarySummary.leaveDeduction)}</h3></div></div>
    <div class="card stat" style="margin:0;padding:14px 16px;background:var(--soft)"><div><small>Status</small><h3 style="color:${delta >= 0 ? 'var(--success)' : 'var(--danger)'}">${getSalaryStatusText(delta)}</h3></div></div>
   </div>
   <div style="margin-top:12px;color:var(--muted);font-size:12px;">Formula: Basic + Allowance + OT = Total Pay</div>
 `;
 const c=document.getElementById('weeklyChart');c.innerHTML='';
 for(let i=6;i>=0;i--){let d=new Date(`${dashboardDate}T12:00:00`);d.setDate(d.getDate()-i);let iso=d.toISOString().slice(0,10),n=db.attendance.filter(a=>a.date===iso&&a.status!=='Absent'&&(!dashboardDept||emp(a.emp)?.dept===dashboardDept)).length,max=Math.max(1,visibleEmployees.length);let h=Math.max(8,Math.min(95,n/max*95));c.innerHTML+=`<div class="bar-wrap"><div class="bar" style="height:${h}%"></div><div class="bar alt" style="height:${Math.max(4,h*.75)}%"></div><div class="bar-label">${d.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3)}</div></div>`}
 document.getElementById('recentActivity').innerHTML=db.attendance.filter(a=>!dashboardDept||emp(a.emp)?.dept===dashboardDept).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(a=>`<div class="activity-row"><span class="dot"></span><div><b>${esc(emp(a.emp)?.name||a.emp)}</b><div style="font-size:11px;color:#6b7280">${esc(a.method)} check-in • ${esc(a.location)}</div></div><small>${esc(formatTime(a.in))}</small></div>`).join('')||'<div class="empty">No activity</div>';
}
function openDashboardTable(page,status=''){if(page==='attendance'){go('attendance');const preset=document.getElementById('dashboardDatePreset').value;document.getElementById('attDatePreset').value=preset;document.getElementById('attDateFrom').value=document.getElementById('dashboardDateFrom').value;document.getElementById('attDateTo').value=document.getElementById('dashboardDateTo').value;toggleDateInput('attDatePreset','attDateRange');syncDatePresetButtons('attDatePreset');document.getElementById('attStatus').value=status;renderAttendance()}else{go(page)}}
function clearDashboardFilters(){document.getElementById('dashboardDatePreset').value='all';document.getElementById('dashboardDateFrom').value='';document.getElementById('dashboardDateTo').value='';document.getElementById('dashboardDept').value='';toggleDateInput('dashboardDatePreset','dashboardDateRange');syncDatePresetButtons('dashboardDatePreset');renderDashboard()}
function getPendingManagerCount(){
 return db.manager.exceptionRequests.filter(x=>x.status==='Pending').length+db.manager.overtimeRequests.filter(x=>x.status==='Pending').length;
}
function renderManager(){
 const pendingExceptions=db.manager.exceptionRequests.filter(x=>x.status==='Pending');
 const pendingOvertime=db.manager.overtimeRequests.filter(x=>x.status==='Pending');
 const period=db.manager.payrollPeriods[currentMonth()]||{status:'Open'};
 const unread=db.manager.notifications.filter(x=>!x.read);
 document.getElementById('managerReviewCount').textContent=pendingExceptions.length;
 document.getElementById('managerOTCount').textContent=pendingOvertime.length;
 document.getElementById('managerPayrollStatus').textContent=period.status;
 document.getElementById('managerPayrollPeriod').textContent=currentMonth();
 document.getElementById('managerAlertCount').textContent=unread.length;
 document.getElementById('managerNavCount').textContent=getPendingManagerCount();
 document.getElementById('notificationCount').textContent=unread.length;
 document.getElementById('managerExceptions').innerHTML=pendingExceptions.length?`<div class="review-list">${pendingExceptions.map(x=>`<div class="review-row"><div class="review-main"><b>${esc(emp(x.emp)?.name||x.emp)} · ${esc(x.type)}</b><small>${esc(x.date)} · ${esc(x.reason)}</small></div><div class="review-actions"><button class="btn success" onclick="decideException('${esc(x.id)}','Approved')">Approve</button><button class="btn danger" onclick="decideException('${esc(x.id)}','Rejected')">Reject</button></div></div>`).join('')}</div>`:'<div class="empty">No attendance exceptions need review.</div>';
 document.getElementById('managerOvertime').innerHTML=pendingOvertime.length?`<div class="review-list">${pendingOvertime.map(x=>`<div class="review-row"><div class="review-main"><b>${esc(emp(x.emp)?.name||x.emp)} · ${Number(x.hours).toFixed(2)} hrs</b><small>${esc(x.date)} · ${esc(x.reason)}</small></div><div class="review-actions"><button class="btn success" onclick="decideOvertime('${esc(x.id)}','Approved')">Approve</button><button class="btn danger" onclick="decideOvertime('${esc(x.id)}','Rejected')">Reject</button></div></div>`).join('')}</div>`:'<div class="empty">No overtime requests need review.</div>';
 document.getElementById('managerSchedule').innerHTML=`<div class="schedule-list">${db.employees.filter(x=>x.status==='Active').map(x=>`<div class="schedule-chip"><b>${esc(x.name)}</b><span>${esc(formatTime(x.startTime||'09:00'))} - ${esc(formatTime(x.endTime||'17:00'))} · ${Number(x.workingHours||8).toFixed(1)} hrs</span></div>`).join('')||'<div class="empty">No active employees.</div>'}</div>`;
 const summaries=db.employees.reduce((acc,x)=>{const summary=getEmployeeMonthlySummary(x,currentMonth());acc.salary+=summary.salary.total;acc.ot+=summary.totalOTPay;acc.paidLeave+=summary.leave.paidLeaveSalary;acc.unpaidLeave+=summary.leave.unpaidDeduction;acc.total+=summary.totalPay;return acc},{salary:0,ot:0,paidLeave:0,unpaidLeave:0,total:0});
 document.getElementById('managerPayrollSummary').innerHTML=`<div class="payroll-summary"><div><small>Base salary</small><b>${money(summaries.salary)}</b></div><div><small>Overtime</small><b>${money(summaries.ot)}</b></div><div><small>Paid leave</small><b>${money(summaries.paidLeave)}</b></div><div><small>Unpaid deduction</small><b>-${money(summaries.unpaidLeave)}</b></div><div><small>Total payroll</small><b>${money(summaries.total)}</b></div><div><small>Period</small><b>${esc(period.status)}</b></div></div>`;
 document.getElementById('payrollLockButton').textContent=period.status==='Finalized'?'Finalized':period.status==='Locked'?'Unlock payroll':'Lock payroll';
 document.getElementById('managerNotifications').innerHTML=db.manager.notifications.length?db.manager.notifications.slice().reverse().map(x=>`<div class="notification-row ${x.read?'':'unread'}"><span class="dot"></span><div>${esc(x.title)}<small>${esc(x.body)} · ${esc(x.time)}</small></div></div>`).join(''):'<div class="empty">No notifications.</div>';
}
function renderApprovals(){
 const exceptions=db.manager.exceptionRequests.filter(item=>item.status==='Pending'),leaves=db.leaves.filter(item=>item.status==='Pending'),overtime=db.manager.overtimeRequests.filter(item=>item.status==='Pending'),period=db.manager.payrollPeriods[currentMonth()]||{status:'Open'};
 document.getElementById('approvalExceptionCount').textContent=exceptions.length;document.getElementById('approvalLeaveCount').textContent=leaves.length;document.getElementById('approvalOvertimeCount').textContent=overtime.length;document.getElementById('approvalPayrollStatus').textContent=period.status;document.getElementById('approvalNavCount').textContent=exceptions.length+leaves.length+overtime.length;
 document.getElementById('approvalExceptions').innerHTML=exceptions.length?`<div class="review-list">${exceptions.map(item=>`<div class="review-row"><div class="review-main"><b>${esc(emp(item.emp)?.name||item.emp)} · ${esc(item.type)}</b><small>${esc(item.date)} · ${esc(item.reason||'Review requested')}</small></div><div class="review-actions"><button class="btn success" onclick="decideException('${esc(item.id)}','Approved')">Approve</button><button class="btn danger" onclick="decideException('${esc(item.id)}','Rejected')">Reject</button></div></div>`).join('')}</div>`:'<div class="empty">No attendance approvals pending.</div>';
 document.getElementById('approvalLeaves').innerHTML=leaves.length?`<div class="review-list">${leaves.map(item=>{const index=db.leaves.indexOf(item);return `<div class="review-row"><div class="review-main"><b>${esc(emp(item.emp)?.name||item.emp)} · ${esc(item.type)}</b><small>${esc(item.from)} to ${esc(item.to)} · ${esc(item.days)} day(s)</small></div><div class="review-actions"><button class="btn success" onclick="approveLeave(${index})">Approve</button><button class="btn danger" onclick="rejectLeave(${index})">Reject</button></div></div>`}).join('')}</div>`:'<div class="empty">No leave approvals pending.</div>';
 document.getElementById('approvalOvertime').innerHTML=overtime.length?`<div class="review-list">${overtime.map(item=>`<div class="review-row"><div class="review-main"><b>${esc(emp(item.emp)?.name||item.emp)} · ${Number(item.hours).toFixed(2)} hours</b><small>${esc(item.date)} · ${esc(item.reason||'Overtime request')}</small></div><div class="review-actions"><button class="btn success" onclick="decideOvertime('${esc(item.id)}','Approved')">Approve</button><button class="btn danger" onclick="decideOvertime('${esc(item.id)}','Rejected')">Reject</button></div></div>`).join('')}</div>`:'<div class="empty">No overtime approvals pending.</div>';
}
function getSelectedSelfEmployee(){return emp(document.getElementById('selfEmployee')?.value||db.employees[0]?.id)}
function getLeaveUsage(employeeId,type){return db.leaves.filter(x=>x.emp===employeeId&&x.type===type&&['Pending','Approved'].includes(x.status)).reduce((sum,x)=>sum+Number(x.days||0),0)}
function renderSelfService(){
 const employee=getSelectedSelfEmployee();if(!employee)return;
 document.getElementById('selfPhone').value=employee.phone||'';document.getElementById('selfEmergency').value=employee.emergencyContact||'';document.getElementById('selfTimezone').value=employee.timezone||'Local time';document.getElementById('selfNotificationPreference').value=employee.notificationPreference||'all';document.getElementById('selfManagerContact').innerHTML=`<div class="schedule-chip"><b>${esc(employee.manager||'Manager Center')}</b><span>${esc(employee.managerEmail||'Contact your manager through the message button.')}</span></div>`;
 const records=db.attendance.filter(x=>x.emp===employee.id&&x.date.startsWith(currentMonth()));
 const summary=getEmployeeMonthlySummary(employee,currentMonth());const salary=summary.salary;const otMinutes=records.reduce((sum,x)=>sum+getOvertimeMinutes(x),0);const otPay=summary.totalOTPay;
 document.getElementById('selfPresent').textContent=records.filter(x=>['Present','Late'].includes(x.status)).length;
 document.getElementById('selfOvertime').textContent=(otMinutes/60).toFixed(2);
 const leaveBalances=db.leaveBalances[employee.id]||{};const remainingLeave=Object.entries(leaveBalances).reduce((sum,[type,total])=>sum+Math.max(0,Number(total)-getLeaveUsage(employee.id,type)),0);
 document.getElementById('selfLeaveBalance').textContent=remainingLeave;
 document.getElementById('selfPay').textContent=money(summary.totalPay);
 document.getElementById('selfScheduleLabel').textContent=`${formatTime(employee.startTime||'09:00')} - ${formatTime(employee.endTime||'17:00')}`;
 document.getElementById('selfSchedule').innerHTML=`<div class="schedule-chip"><b>${esc(employee.dept)} schedule</b><span>${formatTime(employee.startTime||'09:00')} - ${formatTime(employee.endTime||'17:00')} · ${Number(employee.workingHours||8).toFixed(1)} hours/day</span></div>`;
 const balances=db.leaveBalances[employee.id]||{};document.getElementById('selfLeaveDetails').innerHTML=Object.entries(balances).map(([type,total])=>`<div class="payslip-line"><span>${esc(type)}</span><b>${Math.max(0,Number(total)-getLeaveUsage(employee.id,type))} days left</b></div>`).join('');
 document.getElementById('selfAttendanceBody').innerHTML=records.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(formatTime(x.in))}</td><td>${esc(formatTime(x.out))}</td><td>${hours(x).toFixed(2)}</td><td>${(getOvertimeMinutes(x)/60).toFixed(2)}</td><td><span class="badge ${x.status.toLowerCase()}">${esc(x.status)}</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No attendance records this month.</td></tr>';
 renderSelfAttendanceCalendar(records);renderSelfRequestHistory(employee);document.getElementById('selfDocuments').innerHTML=[['Employment contract','employment-contract.txt'],['Company policies','company-policies.txt'],['Salary certificate','salary-certificate.txt']].map(([label,file])=>`<div class="payslip-line"><span>${label}</span><button class="btn" onclick="downloadDocument('${file}','${esc(label)} for ${esc(employee.name)}')">⇩ Download</button></div>`).join('');
 const preference=employee.notificationPreference||'all',messages=db.manager.notifications.filter(item=>preference!=='none'&&(!item.emp||item.emp===employee.id)&& (preference==='all'||/approved|rejected|review|approval/i.test(item.title))).slice().reverse();document.getElementById('selfNotifications').innerHTML=messages.length?messages.map(item=>`<div class="notification-row ${item.read?'':'unread'}"><span class="dot"></span><div>${esc(item.title)}<small>${esc(item.body)} · ${esc(item.time)}</small></div></div>`).join(''):'<div class="empty">No messages or notifications.</div>';
 document.getElementById('selfPayslip').innerHTML=`<div class="payslip-line"><span>Monthly salary</span><b>${money(salary.total)}</b></div><div class="payslip-line"><span>Paid leave salary</span><b>${money(summary.leave.paidLeaveSalary)}</b></div><div class="payslip-line"><span>Unpaid leave deduction</span><b>-${money(summary.leave.unpaidDeduction)}</b></div><div class="payslip-line"><span>Overtime</span><b>${money(otPay)}</b></div><div class="payslip-line"><span>Bonus / deduction</span><b>${money(summary.bonus-summary.deduction)}</b></div><div class="payslip-total"><span>Total pay</span><b>${money(summary.totalPay)}</b></div>`;
}
function renderSelfAttendanceCalendar(records){const month=currentMonth(),first=new Date(`${month}-01T12:00:00`),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),byDate=Object.fromEntries(records.map(record=>[record.date,record]));let html='<div class="attendance-calendar">';for(let day=1;day<=days;day++){const date=`${month}-${String(day).padStart(2,'0')}`,record=byDate[date],status=record?.status?.toLowerCase()||'empty';html+=`<div class="calendar-day ${status}" title="${record?esc(record.status):'No record'}"><b>${day}</b><small>${record?esc(record.status.slice(0,1)):'-'}</small></div>`}document.getElementById('selfAttendanceCalendar').innerHTML=html+'</div>'}
function renderSelfRequestHistory(employee){const requests=[...db.leaves.filter(item=>item.emp===employee.id).map(item=>({type:'Leave',label:`${item.type} · ${item.from} to ${item.to}`,status:item.status,note:item.managerNote})),...db.manager.correctionRequests.filter(item=>item.emp===employee.id).map(item=>({type:'Correction',label:item.date,status:item.status,note:item.managerNote})),...db.manager.overtimeRequests.filter(item=>item.emp===employee.id).map(item=>({type:'Overtime',label:`${item.date} · ${item.hours} hours`,status:item.status,note:item.managerNote}))];document.getElementById('selfRequestHistory').innerHTML=requests.length?requests.slice().reverse().map(item=>`<div class="payslip-line"><span><b>${esc(item.type)}</b> ${esc(item.label)}<small>${item.note?` · ${esc(item.note)}`:''}</small></span><span class="badge ${item.status==='Approved'?'present':item.status==='Rejected'?'absent':'leave'}">${esc(item.status)}</span></div>`).join(''):'<div class="empty">No requests submitted.</div>'}
function normalizeSelfPortalTables(){const employee=getSelectedSelfEmployee();if(!employee)return;const records=db.attendance.filter(record=>record.emp===employee.id&&record.date.startsWith(currentMonth())),balances=db.leaveBalances[employee.id]||{},summary=getEmployeeMonthlySummary(employee,currentMonth()),requests=[...db.leaves.filter(item=>item.emp===employee.id).map(item=>({type:'Leave',request:`${item.type} · ${item.from} to ${item.to}`,status:item.status,note:item.managerNote})),...db.manager.correctionRequests.filter(item=>item.emp===employee.id).map(item=>({type:'Correction',request:item.date,status:item.status,note:item.managerNote})),...db.manager.overtimeRequests.filter(item=>item.emp===employee.id).map(item=>({type:'Overtime',request:`${item.date} · ${item.hours} hours`,status:item.status,note:item.managerNote}))],preference=employee.notificationPreference||'all',messages=db.manager.notifications.filter(item=>preference!=='none'&&(!item.emp||item.emp===employee.id)&&(preference==='all'||/approved|rejected|review|approval/i.test(item.title))).slice().reverse();document.getElementById('selfManagerContact').innerHTML=`<table class="table portal-table"><tbody><tr><th>Manager</th><td>${esc(employee.manager||'Manager Center')}</td></tr><tr><th>Contact</th><td>${esc(employee.managerEmail||'Use the message button')}</td></tr></tbody></table>`;document.getElementById('selfSchedule').innerHTML=`<table class="table portal-table"><thead><tr><th>Department</th><th>Start</th><th>End</th><th>Hours/day</th></tr></thead><tbody><tr><td>${esc(employee.dept)}</td><td>${formatTime(employee.startTime||'09:00')}</td><td>${formatTime(employee.endTime||'17:00')}</td><td>${Number(employee.workingHours||8).toFixed(1)}</td></tr></tbody></table>`;document.getElementById('selfLeaveDetails').innerHTML=`<table class="table portal-table"><thead><tr><th>Leave type</th><th>Days left</th></tr></thead><tbody>${Object.entries(balances).map(([type,total])=>`<tr><td>${esc(type)}</td><td>${Math.max(0,Number(total)-getLeaveUsage(employee.id,type))}</td></tr>`).join('')}</tbody></table>`;document.getElementById('selfAttendanceCalendar').innerHTML=`<table class="table portal-table"><thead><tr><th>Date</th><th>Status</th><th>Hours</th></tr></thead><tbody>${records.map(record=>`<tr><td>${record.date}</td><td><span class="badge ${record.status.toLowerCase()}">${esc(record.status)}</span></td><td>${hours(record).toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">No attendance records this month.</td></tr>'}</tbody></table>`;document.getElementById('selfRequestHistory').innerHTML=`<table class="table portal-table"><thead><tr><th>Type</th><th>Request</th><th>Status</th><th>Reviewer note</th></tr></thead><tbody>${requests.slice().reverse().map(item=>`<tr><td>${esc(item.type)}</td><td>${esc(item.request)}</td><td><span class="badge ${item.status==='Approved'?'present':item.status==='Rejected'?'absent':'leave'}">${esc(item.status)}</span></td><td>${esc(item.note||'Pending review')}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No requests submitted.</td></tr>'}</tbody></table>`;document.getElementById('selfNotifications').innerHTML=`<table class="table portal-table"><thead><tr><th>Message</th><th>Details</th><th>Time</th><th>Status</th></tr></thead><tbody>${messages.map(item=>`<tr><td>${esc(item.title)}</td><td>${esc(item.body)}</td><td>${esc(item.time)}</td><td>${item.read?'Read':'Unread'}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No messages or notifications.</td></tr>'}</tbody></table>`;document.getElementById('selfPayslip').innerHTML=`<table class="table portal-table"><thead><tr><th>Pay item</th><th>Amount</th></tr></thead><tbody><tr><td>Monthly salary</td><td>${money(summary.salary.total)}</td></tr><tr><td>Paid leave salary</td><td>${money(summary.leave.paidLeaveSalary)}</td></tr><tr><td>Unpaid leave deduction</td><td>-${money(summary.leave.unpaidDeduction)}</td></tr><tr><td>Overtime</td><td>${money(summary.totalOTPay)}</td></tr><tr><td>Bonus / deduction</td><td>${money(summary.bonus-summary.deduction)}</td></tr><tr><th>Total pay</th><th>${money(summary.totalPay)}</th></tr></tbody></table>`;document.getElementById('selfDocuments').innerHTML=`<table class="table portal-table"><thead><tr><th>Document</th><th>Action</th></tr></thead><tbody>${[['Employment contract','employment-contract.txt'],['Company policies','company-policies.txt'],['Salary certificate','salary-certificate.txt']].map(([label,file])=>`<tr><td>${label}</td><td><button class="btn" onclick="downloadDocument('${file}','${esc(label)} for ${esc(employee.name)}')">⇩ Download</button></td></tr>`).join('')}</tbody></table>`}
function renderCompactSelfCalendar(records){const month=currentMonth(),first=new Date(`${month}-01T12:00:00`),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),start=(first.getDay()+6)%7,byDate=Object.fromEntries(records.map(record=>[record.date,record]));let cells='';for(let index=0;index<start;index++)cells+='<td class="portal-calendar-empty"></td>';for(let day=1;day<=days;day++){const date=`${month}-${String(day).padStart(2,'0')}`,record=byDate[date],status=record?.status?.toLowerCase()||'empty';cells+=`<td class="portal-calendar-day ${status}" title="${record?esc(record.status):'No record'}"><span class="portal-calendar-date">${day}</span><span class="portal-calendar-status">${record?esc(record.status.slice(0,1)):'-'}</span></td>`}while(cells.split('</td>').length%7!==1)cells+='<td class="portal-calendar-empty"></td>';let rows='';for(let index=0;index<cells.split('</td>').length-1;index+=7)rows+=`<tr>${cells.split('</td>').slice(index,index+7).join('</td>')}</td></tr>`;document.getElementById('selfAttendanceCalendar').innerHTML=`<table class="portal-calendar"><thead><tr><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr></thead><tbody>${rows}</tbody></table>`}
function renderModernSelfCalendar(records){const month=currentMonth(),first=new Date(`${month}-01T12:00:00`),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),start=(first.getDay()+6)%7,byDate=Object.fromEntries(records.map(record=>[record.date,record])),cells=[];for(let index=0;index<start;index++)cells.push(null);for(let day=1;day<=days;day++){const date=`${month}-${String(day).padStart(2,'0')}`;cells.push({date,day,record:byDate[date]})}while(cells.length%7)cells.push(null);const rows=[];for(let index=0;index<cells.length;index+=7)rows.push(cells.slice(index,index+7).map(cell=>{if(!cell)return '<td class="modern-calendar-blank"></td>';const status=cell.record?.status?.toLowerCase()||'empty',weekend=new Date(`${cell.date}T12:00:00`).getDay()%6===0;return `<td class="modern-calendar-day ${status} ${weekend?'modern-calendar-weekend':''} ${cell.date===todayISO()?'modern-calendar-today':''}" title="${cell.record?esc(cell.record.status):'No attendance record'}"><div class="modern-calendar-date">${cell.day}</div><div class="modern-calendar-mark">${cell.record?esc(cell.record.status.slice(0,3)):'—'}</div></td>`}).join(''));document.getElementById('selfAttendanceCalendar').innerHTML=`<div class="modern-calendar-shell"><div class="modern-calendar-head"><div><strong>${first.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</strong><span>Attendance overview</span></div><div class="modern-calendar-legend"><span><i class="legend-present"></i>Present</span><span><i class="legend-late"></i>Late</span><span><i class="legend-empty"></i>No record</span></div></div><table class="modern-calendar"><thead><tr><th>MON</th><th>TUE</th><th>WED</th><th>THU</th><th>FRI</th><th>SAT</th><th>SUN</th></tr></thead><tbody>${rows.map(row=>`<tr>${row}</tr>`).join('')}</tbody></table></div>`}
function renderWeeklySchedule(){
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 document.getElementById('weeklySchedule').innerHTML=`<div class="weekly-board">${days.map((day,index)=>{const weekend=index>4;return `<div class="day-column"><h4>${day}</h4>${weekend?'<div class="empty">Day off</div>':db.employees.filter(x=>x.status==='Active').map(x=>`<div class="day-person"><b>${esc(x.name)}</b><span>${formatTime(x.startTime||'09:00')} - ${formatTime(x.endTime||'17:00')}</span></div>`).join('')}</div>`}).join('')}</div>`;
}
function renderLeaveBalances(){
 document.getElementById('leaveBalances').innerHTML=db.employees.filter(x=>x.status==='Active').map(x=>{const balance=db.leaveBalances[x.id]||{};const remaining=Object.entries(balance).reduce((sum,[type,total])=>sum+Math.max(0,Number(total)-getLeaveUsage(x.id,type)),0);return `<div class="card balance-card"><small>${esc(x.name)}</small><h3>${Math.max(0,remaining)} days</h3><span class="subtle">remaining leave</span></div>`}).join('')||'<div class="empty">No active employees.</div>';
}
function renderHolidayList(){document.getElementById('holidayList').innerHTML=db.holidays.length?db.holidays.sort((a,b)=>a.date.localeCompare(b.date)).map((x,i)=>`<div class="payslip-line"><span>${esc(x.date)} · ${esc(x.name)}</span><button class="btn" onclick="removeHoliday(${i})">Remove</button></div>`).join(''):'<div class="empty">No company holidays configured.</div>'}
function addHoliday(){const date=document.getElementById('holidayDate').value;const name=document.getElementById('holidayName').value.trim();if(!date||!name){toast('Holiday date and name are required');return}if(db.holidays.some(x=>x.date===date)){toast('A holiday already exists on this date');return}db.holidays.push({date,name});addAudit('Holiday added',`${date} — ${name}`);save();renderAll();document.getElementById('holidayDate').value='';document.getElementById('holidayName').value='';toast('Holiday added')}
function removeHoliday(index){const item=db.holidays[index];if(!item)return;db.holidays.splice(index,1);addAudit('Holiday removed',`${item.date} — ${item.name}`);save();renderAll();toast('Holiday removed')}
function importEmployees(event){const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const lines=String(reader.result).split(/\r?\n/).filter(Boolean);if(lines.length<2){toast('CSV must include a header and at least one employee');return}const headers=lines.shift().split(',').map(x=>x.trim().toLowerCase());let added=0;lines.forEach(line=>{const values=line.split(',').map(x=>x.trim());const row=Object.fromEntries(headers.map((header,index)=>[header,values[index]||'']));if(!row.id||!row.name||db.employees.some(x=>x.id===row.id))return;const employee={id:row.id,name:row.name,dept:row.department||row.dept||'General',email:row.email||'',location:row.location||'Main Office',phone:row.phone||'',rate:Number(row.rate||0),status:row.status||'Active',bio:'Not enrolled',workingHours:Number(row.workinghours||row.working_hours||8),startTime:row.starttime||row.start_time||'09:00',endTime:row.endtime||row.end_time||'17:00',basicSalary:Number(row.basicsalary||row.basic_salary||0),allowance:Number(row.allowance||0),monthlySalary:Number(row.monthlysalary||row.monthly_salary||0)};db.employees.push(employee);db.leaveBalances[employee.id]={Annual:20,Sick:10,Personal:5};added++});if(added){addAudit('Employees imported',`${added} employee${added===1?'':'s'}`);save();renderAll();toast(`${added} employee${added===1?'':'s'} imported`)}else toast('No new valid employees found in CSV');event.target.value=''};reader.readAsText(file)}
function openPayslip(){const employee=getSelectedSelfEmployee();if(!employee)return;const summary=getEmployeeMonthlySummary(employee,currentMonth());const salary=summary.salary;document.getElementById('payslipContent').innerHTML=`<div class="payslip"><div class="payslip-head"><div><b>${esc(employee.name)}</b><small>${esc(employee.id)} · ${esc(employee.dept)}</small></div><b>${esc(currentMonth())}</b></div><div class="payslip-line"><span>Basic salary</span><b>${money(salary.basic)}</b></div><div class="payslip-line"><span>Allowance</span><b>${money(salary.allowance)}</b></div><div class="payslip-line"><span>Paid leave salary</span><b>${money(summary.leave.paidLeaveSalary)}</b></div><div class="payslip-line"><span>Unpaid leave deduction</span><b>-${money(summary.leave.unpaidDeduction)}</b></div><div class="payslip-line"><span>Overtime</span><b>${money(summary.totalOTPay)}</b></div><div class="payslip-line"><span>Bonus / deduction</span><b>${money(summary.bonus-summary.deduction)}</b></div><div class="payslip-total"><span>Net pay</span><b>${money(summary.totalPay)}</b></div></div>`;openModal('payslipModal')}
function printPayslip(){const content=document.getElementById('payslipContent').innerHTML;const win=window.open('','_blank');win.document.write(`<html><head><title>SmartAttend Payslip</title><style>body{font-family:Arial;padding:30px}b{font-weight:700}.payslip-line,.payslip-total{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}.payslip-total{font-size:18px}</style></head><body>${content}<script>window.print();<\/script></body></html>`);win.document.close()}
function finalizePayroll(){const period=db.manager.payrollPeriods[currentMonth()]||{status:'Open'};if(period.status==='Finalized'){toast('Payroll is already finalized');return}if(period.status!=='Locked'){toast('Lock the payroll period from Manager Center before finalizing');return}period.status='Finalized';db.manager.payrollPeriods[currentMonth()]=period;addAudit('Payroll finalized',currentMonth());save();renderAll();toast('Payroll finalized')}
function decideException(id,status){
 if(!canPerform(['admin','manager']))return;
 const item=db.manager.exceptionRequests.find(x=>x.id===id);if(!item)return;
 item.status=status;item.managerNote=`Reviewed by ${currentRole}`;addAudit(`Exception ${status.toLowerCase()}`,`${emp(item.emp)?.name||item.emp} — ${item.type}`);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:item.emp,title:`Exception ${status.toLowerCase()}`,body:`${emp(item.emp)?.name||item.emp} · ${item.type}`,time:nowLabel(),read:false});save();renderAll();toast(`Attendance exception ${status.toLowerCase()}`)
}
function decideOvertime(id,status){
 if(!canPerform(['admin','manager']))return;
 const item=db.manager.overtimeRequests.find(x=>x.id===id);if(!item)return;
 item.status=status;item.managerNote=`Reviewed by ${currentRole}`;addAudit(`Overtime ${status.toLowerCase()}`,`${emp(item.emp)?.name||item.emp} — ${item.hours} hours`);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:item.emp,title:`Overtime ${status.toLowerCase()}`,body:`${emp(item.emp)?.name||item.emp} · ${item.hours} hours`,time:nowLabel(),read:false});save();renderAll();toast(`Overtime ${status.toLowerCase()}`)
}
function togglePayrollLock(){
 if(!canPerform(['admin','manager','payroll']))return;
 const period=db.manager.payrollPeriods[currentMonth()]||{status:'Open'};if(period.status==='Finalized'){toast('Finalized payroll cannot be unlocked');return}period.status=period.status==='Locked'?'Open':'Locked';db.manager.payrollPeriods[currentMonth()]=period;addAudit(`Payroll ${period.status.toLowerCase()}`,currentMonth());save();renderAll();toast(`Payroll ${period.status.toLowerCase()}`)
}
function markNotificationsRead(){db.manager.notifications.forEach(x=>x.read=true);save();renderAll();toast('Notifications marked as read')}
function employeeClockAction(action){const employee=getSelectedSelfEmployee();if(!employee){toast('Select an employee first');return}const date=todayISO(),record=db.attendance.find(item=>item.emp===employee.id&&item.date===date);if(action==='in'){if(record){toast('Today already has an attendance record');return}const time=new Date().toTimeString().slice(0,5);db.attendance.push({date,emp:employee.id,method:'Portal',in:time,out:'',location:'Employee portal',status:'Present'});db.manager.notifications.push({id:`NT-${Date.now()}`,emp:employee.id,title:'Clock-in recorded',body:`Your portal clock-in was recorded at ${formatTime(time)}.`,time:nowLabel(),read:false});addAudit('Portal clock-in',employee.name)}else{if(!record){toast('Clock in before clocking out');return}if(record.out){toast('Today is already checked out');return}record.out=new Date().toTimeString().slice(0,5);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:employee.id,title:'Clock-out recorded',body:`Your portal clock-out was recorded at ${formatTime(record.out)}.`,time:nowLabel(),read:false});addAudit('Portal clock-out',employee.name)}save();renderAll();toast(action==='in'?'Clock-in recorded':'Clock-out recorded')}
function markSelfNotificationsRead(){const employee=getSelectedSelfEmployee();if(!employee)return;db.manager.notifications.filter(item=>!item.emp||item.emp===employee.id).forEach(item=>item.read=true);save();renderAll();toast('Portal messages marked as read')}
function saveEmployeeProfile(){const employee=getSelectedSelfEmployee();if(!employee)return;employee.phone=document.getElementById('selfPhone').value.trim();employee.emergencyContact=document.getElementById('selfEmergency').value.trim();employee.timezone=document.getElementById('selfTimezone').value;employee.notificationPreference=document.getElementById('selfNotificationPreference').value;addAudit('Employee profile updated',employee.name);save();renderSelfService();toast('Profile saved')}
function sendEmployeeMessage(){const employee=getSelectedSelfEmployee();if(!employee)return;const message=prompt('Message for your manager:');if(!message?.trim())return;db.manager.notifications.push({id:`NT-${Date.now()}`,emp:employee.id,audience:'manager',title:`Message from ${employee.name}`,body:message.trim(),time:nowLabel(),read:false});addAudit('Employee message sent',employee.name);save();renderAll();toast('Message sent to your manager')}
function downloadSelfAttendance(){const employee=getSelectedSelfEmployee();if(!employee)return;const records=db.attendance.filter(record=>record.emp===employee.id),rows=[['Date','Check in','Check out','Hours','Status'],...records.map(record=>[record.date,record.in||'',record.out||'',hours(record).toFixed(2),record.status])];const blob=new Blob([rows.map(row=>row.join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${employee.id}-attendance.csv`;link.click();URL.revokeObjectURL(url)}
function downloadSelfPayslip(){const employee=getSelectedSelfEmployee();if(!employee)return;const summary=getEmployeeMonthlySummary(employee,currentMonth()),rows=[['Item','Amount'],['Basic salary',summary.salary.basic],['Allowance',summary.salary.allowance],['Paid leave',summary.leave.paidLeaveSalary],['Unpaid deduction',-summary.leave.unpaidDeduction],['Overtime',summary.totalOTPay],['Bonus',summary.bonus],['Deduction',-summary.deduction],['Total pay',summary.totalPay]];const blob=new Blob([rows.map(row=>row.join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${employee.id}-payslip-${currentMonth()}.csv`;link.click();URL.revokeObjectURL(url)}
function downloadDocument(fileName,title){const content=`${title}\n\nThis document is available in the SmartAttend employee portal.\nGenerated: ${nowLabel()}`;const blob=new Blob([content],{type:'text/plain'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;link.click();URL.revokeObjectURL(url)}
function refreshManagerData(){renderAll();toast('Manager data refreshed')}
function changeRole(role){currentRole=role;const labels={admin:'Administrator',manager:'Manager',payroll:'Payroll',employee:'Employee view'};document.querySelector('.avatar').textContent=role==='employee'?'E':role==='manager'?'M':role==='payroll'?'P':'A';applyRolePermissions();go(role==='employee'?'selfservice':role==='payroll'?'payroll':role==='manager'?'manager':'dashboard');addAudit('Role switched',labels[role]);toast(`Viewing as ${labels[role]}`)}
function exportPayroll(){
 if(!canPerform(['admin','manager','payroll']))return;
 const rows=[['Employee','Department','Basic','Allowance','Total Salary','Paid Leave','Unpaid Deduction','OT Hours','Total OT','Bonus','Deduction','Total Pay']];
 db.employees.forEach(e=>{const summary=getEmployeeMonthlySummary(e,currentMonth());rows.push([e.name,e.dept,summary.salary.basic,summary.salary.allowance,summary.salary.total,summary.leave.paidLeaveSalary,summary.leave.unpaidDeduction,(summary.totalOTMinutes/60).toFixed(2),summary.totalOTPay,summary.bonus,summary.deduction,summary.totalPay])});
 const blob=new Blob([rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`payroll-${currentMonth()}.csv`;link.click();URL.revokeObjectURL(url);
}
function renderAttendance(){
 const q=(document.getElementById('attSearch').value||'').toLowerCase(),preset=document.getElementById('attDatePreset').value,from=document.getElementById('attDateFrom').value,to=document.getElementById('attDateTo').value,status=document.getElementById('attStatus').value,period=document.getElementById('attPeriod').value;
 let rows=db.attendance.filter(a=>{const recordDate=new Date(`${a.date}T12:00:00`);let inPeriod=true;if(preset!=='all'&&period==='day')inPeriod=matchesDatePreset(a.date,preset,from,to);if(preset!=='all'&&period==='week'){const anchor=new Date(`${datePresetRange(preset,from,to).from}T12:00:00`);const diff=Math.floor((recordDate-anchor)/86400000);inPeriod=diff>=0&&diff<7}if(preset!=='all'&&period==='month')inPeriod=a.date.startsWith((datePresetRange(preset,from,to).from||from).slice(0,7));return inPeriod&&(!q||(emp(a.emp)?.name||'').toLowerCase().includes(q)||a.emp.toLowerCase().includes(q))&&(!status||a.status===status)});
 document.getElementById('attendanceBody').innerHTML=rows.map(a=>`<tr><td>${esc(a.date)}</td><td><b>${esc(emp(a.emp)?.name||a.emp)}</b><br><small>${esc(a.emp)}</small></td><td>${esc(a.method)}</td><td>${esc(formatTime(a.in))}</td><td>${esc(formatTime(a.out))}</td><td>${hours(a).toFixed(2)}</td><td>${(getOvertimeMinutes(a)/60).toFixed(2)}</td><td>${money(rate(a))}</td><td><b>${money(pay(a))}</b></td><td>${esc(a.location||'—')}</td><td><span class="badge ${a.status.toLowerCase()}">${esc(a.status)}</span></td></tr>`).join('')||'<tr><td colspan="11" class="empty">No records match the selected filters.</td></tr>';
}
function renderEmployees(){
 const q=(document.getElementById('empSearch').value||'').toLowerCase(),d=document.getElementById('empDept').value,status=document.getElementById('empStatusFilter').value;
 document.getElementById('employeesBody').innerHTML=db.employees.filter(e=>(!q||[e.id,e.name,e.dept,e.email,e.location,e.phone].join(' ').toLowerCase().includes(q))&&(!d||e.dept===d)&&(!status||e.status===status)).map(e=>{
  const salary=getSalaryBreakdown(e);
  return `<tr><td><input type="checkbox" aria-label="Select ${esc(e.name)}" ${selectedEmployeeIds.has(e.id)?'checked':''} onchange="toggleEmployeeSelection('${esc(e.id)}',this.checked)"></td><td>${esc(e.id)}</td><td><b>${esc(e.name)}</b></td><td>${esc(e.dept)}</td><td>${esc(e.email||'—')}</td><td>${esc(e.location||'—')}</td><td>${esc(e.phone)}</td><td>${esc(formatTime(e.startTime||'09:00'))}</td><td>${esc(formatTime(e.endTime||'17:00'))}</td><td>${Number(e.workingHours ?? e.workHours ?? 8).toFixed(1)} hrs</td><td>${money(salary.total)}</td><td><button class="btn" onclick="editEmployee('${esc(e.id)}')">Edit</button> <button class="btn" onclick="removeEmployee('${esc(e.id)}')">Delete</button></td></tr>`;
 }).join('')||'<tr><td colspan="11" class="empty">No employees found.</td></tr>';
}
function renderDepartments(){document.getElementById('departmentCards').innerHTML=db.departments.map(d=>{let n=db.employees.filter(e=>e.dept===d).length;return `<div class="card"><div class="stat"><div><small>Department</small><h2 style="font-size:19px">${esc(d)}</h2><span style="color:var(--muted);font-size:12px">${n} employee${n===1?'':'s'}</span></div><div class="stat-icon">▤</div></div></div>`}).join('')}
function renderShifts(){const q=(document.getElementById('shiftSearch').value||'').toLowerCase(),status=document.getElementById('shiftStatusFilter').value;document.getElementById('shiftsBody').innerHTML=db.shifts.filter(s=>(!q||[s.name,s.days].join(' ').toLowerCase().includes(q))&&(!status||s.status===status)).map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(formatTime(s.start))}</td><td>${esc(formatTime(s.end))}</td><td>${esc(s.grace)} min</td><td>${esc(s.days)}</td><td><span class="badge present">${esc(s.status)}</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No shifts match the selected filters.</td></tr>'}
function renderPayroll(){
 let month=document.getElementById('payMonth').value||todayISO().slice(0,7),dept=document.getElementById('payDept').value,preset=document.getElementById('payDatePreset').value,from=document.getElementById('payDateFrom').value,to=document.getElementById('payDateTo').value;
 document.getElementById('payrollBody').innerHTML=db.employees.filter(e=>!dept||e.dept===dept).map(e=>{
  const summary=getEmployeeMonthlySummary(e,month),salary=summary.salary;
  const rs=db.attendance.filter(a=>a.emp===e.id && (preset==='all'?a.date.startsWith(month):matchesDatePreset(a.date,preset,from,to)));
  const otHours=(summary.totalOTMinutes/60).toFixed(2);
  const otPay=summary.totalOTPay;
  const totalPay = summary.totalPay;
  const status = getSalaryDeltaText(totalPay - salary.total);
  return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.dept)}</td><td>${money(salary.basic)}</td><td>${money(salary.allowance)}</td><td><b>${money(salary.total)}</b></td><td>${money(summary.leave.paidLeaveSalary)}</td><td>-${money(summary.leave.unpaidDeduction)}</td><td>${otHours}h</td><td>${money(otPay)}</td><td>${money(summary.bonus)}</td><td>-${money(summary.deduction)}</td><td><b>${money(totalPay)}</b></td><td><span class="badge ${totalPay >= salary.total ? 'present' : 'absent'}">${esc(status)}</span></td></tr>`}).join('')||'<tr><td colspan="13" class="empty">No payroll rows available.</td></tr>';
}
function renderLocations(){document.getElementById('locationCards').innerHTML=db.locations.map(l=>`<div class="card"><div class="stat"><div><small>Attendance site</small><h2 style="font-size:18px">${esc(l.name)}</h2><span style="font-size:12px;color:var(--muted)">${esc(l.address)}</span></div><div class="stat-icon">⌖</div></div><div style="margin-top:14px;font-size:11px;color:var(--muted)">GPS: ${l.lat&&l.lng?esc(l.lat)+', '+esc(l.lng):'Not fixed'} • <span style="color:var(--success)">Active</span></div></div>`).join('')}
function renderLeaves(){const q=(document.getElementById('leaveSearch').value||'').toLowerCase(),preset=document.getElementById('leaveDatePreset').value,from=document.getElementById('leaveDateFrom').value,to=document.getElementById('leaveDateTo').value,type=document.getElementById('leaveTypeFilter').value,statusFilter=document.getElementById('leaveStatusFilter').value;document.getElementById('leaveBody').innerHTML=db.leaves.map((l,i)=>({leave:l,index:i,employee:emp(l.emp)})).filter(x=>(!q||(x.employee?.name||x.leave.emp).toLowerCase().includes(q))&&matchesDatePreset(x.leave.from,preset,from,to)&&(!type||x.leave.type===type)&&(!statusFilter||x.leave.status===statusFilter)).map(({leave:l,index:i,employee})=>{const payroll=getLeavePayroll(employee||{},l.from.slice(0,7));const value=payroll.dailyRate*Number(l.days||0);const display=l.type==='Unpaid'?`-${money(value)}`:money(value);return `<tr><td>${esc(employee?.name||l.emp)}</td><td>${esc(l.type)}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td><td>${esc(l.days)}</td><td>${display}</td><td><span class="badge ${l.status==='Approved'?'present':l.status==='Rejected'?'absent':'leave'}">${esc(l.status)}</span></td><td>${l.status==='Pending'?`<button class="btn success" onclick="approveLeave(${i})">Approve</button> <button class="btn danger" onclick="rejectLeave(${i})">Reject</button>`:'—'}</td></tr>`}).join('')||'<tr><td colspan="8" class="empty">No leave requests match the selected filters.</td></tr>'}
function renderAudit(){const q=(document.getElementById('auditSearch').value||'').toLowerCase();const action=document.getElementById('auditActionFilter').value;const actions=[...new Set(db.audit.map(x=>x.action))].sort();document.getElementById('auditActionFilter').innerHTML='<option value="">All actions</option>'+actions.map(x=>`<option>${esc(x)}</option>`).join('');document.getElementById('auditActionFilter').value=action;document.getElementById('auditBody').innerHTML=db.audit.filter(x=>(!q||[x.user,x.action,x.details,x.time].join(' ').toLowerCase().includes(q))&&(!action||x.action===action)).map(x=>`<tr><td>${esc(x.time)}</td><td>${esc(x.user)}</td><td>${esc(x.action)}</td><td>${esc(x.details)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No audit entries match the selected filters.</td></tr>'}
function getReportRows(){const q=(document.getElementById('reportSearch').value||'').toLowerCase(),from=document.getElementById('reportFrom').value,to=document.getElementById('reportTo').value,dept=document.getElementById('reportDept').value,status=document.getElementById('reportStatus').value;return db.attendance.filter(record=>(!from||record.date>=from)&&(!to||record.date<=to)&&(!q||(emp(record.emp)?.name||record.emp).toLowerCase().includes(q))&&(!dept||emp(record.emp)?.dept===dept)&&(!status||record.status===status))}
let reportPage=1;
function setupReportControls(){const filters=document.querySelector('.report-filters');if(!filters||document.getElementById('reportSort'))return;filters.insertAdjacentHTML('beforeend','<select id="reportSort" onchange="reportPage=1;renderReports()"><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="employee-asc">Employee A-Z</option><option value="pay-desc">Highest pay</option></select><select id="reportPageSize" onchange="reportPage=1;renderReports()"><option value="10">10 rows</option><option value="25">25 rows</option><option value="50">50 rows</option></select><span id="reportPagination" class="subtle"></span><button class="btn" onclick="changeReportPage(-1)">Previous</button><button class="btn" onclick="changeReportPage(1)">Next</button>')}
function getVisibleReportRows(){const rows=getReportRows().slice(),sort=document.getElementById('reportSort')?.value||'date-desc';rows.sort((left,right)=>{if(sort==='employee-asc')return (emp(left.emp)?.name||left.emp).localeCompare(emp(right.emp)?.name||right.emp);if(sort==='pay-desc')return pay(right)-pay(left);return sort==='date-asc'?left.date.localeCompare(right.date):right.date.localeCompare(left.date)});const pageSize=Number(document.getElementById('reportPageSize')?.value)||10;const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));reportPage=Math.min(Math.max(1,reportPage),totalPages);return {rows:rows.slice((reportPage-1)*pageSize,reportPage*pageSize),total:rows.length,totalPages}}
function changeReportPage(delta){reportPage+=delta;renderReports()}
function renderReports(){const result=getVisibleReportRows(),rows=getReportRows();document.getElementById('reportRecords').textContent=rows.length;document.getElementById('reportHours').textContent=rows.reduce((sum,record)=>sum+hours(record),0).toFixed(1);document.getElementById('reportPay').textContent=money(rows.reduce((sum,record)=>sum+pay(record),0));document.getElementById('reportLocations').textContent=new Set(rows.map(record=>record.location).filter(Boolean)).size;document.getElementById('reportPagination').textContent=result.total?`Page ${reportPage} of ${result.totalPages}`:'No rows';document.getElementById('reportBody').innerHTML=result.rows.map(record=>`<tr><td>${esc(record.date)}</td><td><b>${esc(emp(record.emp)?.name||record.emp)}</b></td><td>${esc(emp(record.emp)?.dept||'—')}</td><td><span class="badge ${record.status.toLowerCase()}">${esc(record.status)}</span></td><td>${hours(record).toFixed(2)}</td><td><b>${money(pay(record))}</b></td><td>${esc(record.location||'—')}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No report data matches the selected filters.</td></tr>'}
function renderAll(){fillSelects();renderDashboard();renderManager();renderApprovals();renderSelfService();normalizeSelfPortalTables();renderModernSelfCalendar(db.attendance.filter(record=>record.emp===getSelectedSelfEmployee()?.id&&record.date.startsWith(currentMonth())));renderAttendance();renderEmployees();renderDepartments();renderShifts();renderWeeklySchedule();renderPayroll();renderLocations();renderLeaves();renderLeaveBalances();renderHolidayList();renderAudit();renderReports()}
function addEmployee(e){e.preventDefault();if(!canPerform(['admin','manager']))return;
  const form = e.target;
  const id = (document.getElementById('eId')?.value || '').trim();
  const name = (document.getElementById('eName')?.value || '').trim();
  const dept = document.getElementById('eDept')?.value || 'General';
  const phone = (document.getElementById('ePhone')?.value || '').trim();
  const email = (document.getElementById('eEmail')?.value || '').trim();
  const location = (document.getElementById('eLocation')?.value || '').trim();
  const rate = Number(document.getElementById('eRate')?.value || 0);
  const workingHours = Number(document.getElementById('eWork')?.value || 8);
  const startTime = document.getElementById('eStart')?.value || '09:00';
  const endTime = document.getElementById('eEnd')?.value || '17:00';
  const basicSalary = Number(document.getElementById('eBasic')?.value || 0);
  const allowance = Number(document.getElementById('eAllowance')?.value || 0);
  const monthlySalary = Number(document.getElementById('eMonthly')?.value || basicSalary + allowance);
  const monthlyBonus = Number(document.getElementById('eBonus')?.value || 0);
  const monthlyDeduction = Number(document.getElementById('eDeduction')?.value || 0);
  const status = document.getElementById('eStatus')?.value || 'Active';
  if(!id || !name){toast('Employee ID and name are required');return}
  const existing=emp(id);
  if(existing){
  Object.assign(existing,{name,dept,email,location,phone,rate,status,workingHours,workHours:workingHours,startTime,endTime,basicSalary:basicSalary||0,allowance,monthlySalary:monthlySalary || basicSalary + allowance,monthlyBonus,monthlyDeduction});
   addAudit('Employee updated',name);
  }else{
  const x={id,name,dept,email,location,phone,rate,status,bio:'Not enrolled',workingHours,workHours:workingHours,startTime,endTime,basicSalary:basicSalary||0,allowance,monthlySalary:monthlySalary || basicSalary + allowance,monthlyBonus,monthlyDeduction};
   db.employees.push(x);
   addAudit('Employee added',name);
  }
  save();closeModal('employeeModal');form.reset();document.getElementById('eId').disabled=false;renderAll();toast(existing?'Employee updated':'Employee saved')
}
function removeEmployee(id){if(!canPerform(['admin']))return;if(confirm('Delete this employee?')){let x=emp(id);db.employees=db.employees.filter(e=>e.id!==id);db.attendance=db.attendance.filter(a=>a.emp!==id);addAudit('Employee deleted',x?.name||id);save();renderAll();toast('Employee deleted')}}
function addAttendance(e){e.preventDefault();if(!canPerform(['admin','manager','employee']))return;if(aOut.value===aIn.value&&aOut.value!==''&&aIn.value!==''){toast('Check-out must be different from check-in');return}if(db.attendance.some(x=>x.emp===aEmp.value&&x.date===aDate.value)){toast('An attendance record already exists for this employee and date');return}let x={date:aDate.value,emp:aEmp.value,method:aMethod.value,in:aIn.value,out:aOut.value,location:aLocation.value||'Unspecified',status:aStatus.value};db.attendance.push(x);if(!x.out){const exception={id:`EX-${Date.now()}`,type:'Missing checkout',emp:x.emp,date:x.date,reason:'Attendance was saved without a checkout time.',status:'Pending'};db.manager.exceptionRequests.push(exception);db.manager.correctionRequests.push(exception)}addAudit('Attendance added',`${emp(x.emp)?.name||x.emp} — ${x.date} — ${x.method}`);save();closeModal('attendanceModal');renderAll();toast('Attendance saved')}
function addDepartment(e){e.preventDefault();let n=dName.value.trim();if(!db.departments.includes(n))db.departments.push(n);addAudit('Department added',n);save();closeModal('departmentModal');e.target.reset();renderAll();toast('Department saved')}
function addShift(e){e.preventDefault();db.shifts.push({name:sName.value,start:sStart.value,end:sEnd.value,grace:+sGrace.value,days:'Mon–Fri',status:'Active'});addAudit('Shift added',sName.value);save();closeModal('shiftModal');e.target.reset();renderAll();toast('Shift saved')}
function addLocation(e){e.preventDefault();db.locations.push({name:lName.value,address:lAddress.value,lat:lLat.value,lng:lLng.value,status:'Active'});addAudit('Location added',lName.value);save();closeModal('locationModal');e.target.reset();renderAll();toast('Location saved')}
function addCorrection(e){e.preventDefault();const item={id:`EX-${Date.now()}`,type:'Attendance correction',emp:cEmp.value,date:cDate.value,requestedIn:cIn.value,requestedOut:cOut.value,reason:cReason.value.trim(),status:'Pending'};if(!item.reason){toast('A correction reason is required');return}db.manager.correctionRequests.push(item);db.manager.exceptionRequests.push(item);addAudit('Correction requested',`${emp(item.emp)?.name||item.emp} — ${item.date}`);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:item.emp,title:'Correction request submitted',body:`${emp(item.emp)?.name||item.emp} · ${item.date}`,time:nowLabel(),read:false});save();closeModal('correctionModal');renderAll();toast('Correction submitted for approval')}
function addLeave(e){e.preventDefault();let f=new Date(lvFrom.value),t=new Date(lvTo.value);if(t<f){toast('End date must be after start date');return}let days=Math.floor((t-f)/86400000)+1;const balance=db.leaveBalances[lvEmp.value]?.[lvType.value]??0;const used=getLeaveUsage(lvEmp.value,lvType.value);const overlaps=db.leaves.some(x=>x.emp===lvEmp.value&&['Pending','Approved'].includes(x.status)&&new Date(x.from)<=t&&new Date(x.to)>=f);if(overlaps){toast('This leave overlaps an existing request');return}if(lvType.value!=='Unpaid'&&used+days>balance){toast(`Only ${Math.max(0,balance-used)} ${lvType.value.toLowerCase()} leave days remain`);return}db.leaves.push({emp:lvEmp.value,type:lvType.value,from:lvFrom.value,to:lvTo.value,days,status:'Pending'});addAudit('Leave requested',emp(lvEmp.value)?.name||lvEmp.value);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:lvEmp.value,title:'Leave request submitted',body:`${lvType.value} leave from ${lvFrom.value} to ${lvTo.value} is awaiting review.`,time:nowLabel(),read:false});save();closeModal('leaveModal');renderAll();toast('Leave request submitted')}
function approveLeave(i){if(!canPerform(['admin','manager']))return;const item=db.leaves[i];if(!item)return;item.status='Approved';item.managerNote=`Reviewed by ${currentRole}`;addAudit('Leave approved',emp(item.emp)?.name||item.emp);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:item.emp,title:'Leave request approved',body:`${item.type} leave from ${item.from} to ${item.to} was approved.`,time:nowLabel(),read:false});save();renderAll();toast('Leave approved')}
function rejectLeave(i){if(!canPerform(['admin','manager']))return;const item=db.leaves[i];if(!item)return;item.status='Rejected';item.managerNote=`Reviewed by ${currentRole}`;addAudit('Leave rejected',emp(item.emp)?.name||item.emp);db.manager.notifications.push({id:`NT-${Date.now()}`,emp:item.emp,title:'Leave request rejected',body:`${item.type} leave from ${item.from} to ${item.to} was rejected.`,time:nowLabel(),read:false});save();renderAll();toast('Leave rejected')}
function clearAudit(){if(confirm('Clear audit log?')){db.audit=[];save();renderAudit();toast('Audit log cleared')}}
function clearFilters(){document.getElementById('attSearch').value='';document.getElementById('attDateFrom').value='';document.getElementById('attDateTo').value='';document.getElementById('attDatePreset').value='all';document.getElementById('attStatus').value='';document.getElementById('attPeriod').value='day';toggleDateInput('attDatePreset','attDateRange');syncDatePresetButtons('attDatePreset');renderAttendance()}
function clearEmployeeFilters(){document.getElementById('empSearch').value='';document.getElementById('empDept').value='';document.getElementById('empStatusFilter').value='';renderEmployees()}
function clearShiftFilters(){document.getElementById('shiftSearch').value='';document.getElementById('shiftStatusFilter').value='';renderShifts()}
function clearLeaveFilters(){document.getElementById('leaveSearch').value='';document.getElementById('leaveDateFrom').value='';document.getElementById('leaveDateTo').value='';document.getElementById('leaveDatePreset').value='all';document.getElementById('leaveTypeFilter').value='';document.getElementById('leaveStatusFilter').value='';toggleDateInput('leaveDatePreset','leaveDateRange');syncDatePresetButtons('leaveDatePreset');renderLeaves()}
function clearAuditFilters(){document.getElementById('auditSearch').value='';document.getElementById('auditActionFilter').value='';renderAudit()}
function clearPayrollFilters(){document.getElementById('payMonth').value='';document.getElementById('payDateFrom').value='';document.getElementById('payDateTo').value='';document.getElementById('payDatePreset').value='all';document.getElementById('payDept').value='';toggleDateInput('payDatePreset','payDateRange');syncDatePresetButtons('payDatePreset');renderPayroll()}
function setupEmployeeBulkControls(){const table=document.getElementById('employeesBody')?.closest('table');if(!table||document.getElementById('employeeBulkActions'))return;table.parentElement.insertAdjacentHTML('beforebegin','<div class="bulk-actions" id="employeeBulkActions"><label><input type="checkbox" onchange="toggleAllEmployees(this.checked)"> Select all visible</label><button class="btn" onclick="bulkDeactivateEmployees()">Deactivate selected</button><button class="btn danger" onclick="bulkDeleteEmployees()">Delete selected</button><span id="employeeSelectionCount" class="subtle">0 selected</span></div>');table.querySelector('thead tr').insertAdjacentHTML('afterbegin','<th>Select</th>')}
function toggleEmployeeSelection(id,selected){if(selected)selectedEmployeeIds.add(id);else selectedEmployeeIds.delete(id);document.getElementById('employeeSelectionCount').textContent=`${selectedEmployeeIds.size} selected`}
function toggleAllEmployees(selected){document.querySelectorAll('#employeesBody input[type="checkbox"]').forEach(input=>{input.checked=selected;const rowId=input.closest('tr').children[1].textContent.trim();if(selected)selectedEmployeeIds.add(rowId);else selectedEmployeeIds.delete(rowId)});document.getElementById('employeeSelectionCount').textContent=`${selectedEmployeeIds.size} selected`}
function bulkDeactivateEmployees(){if(!canPerform(['admin','manager'])||!selectedEmployeeIds.size){toast('Select at least one employee');return}selectedEmployeeIds.forEach(id=>{const employee=emp(id);if(employee)employee.status='Inactive'});addAudit('Employees deactivated',`${selectedEmployeeIds.size} employees`);selectedEmployeeIds.clear();save();renderAll();toast('Selected employees deactivated')}
function bulkDeleteEmployees(){if(!canPerform(['admin'])||!selectedEmployeeIds.size){toast('Select at least one employee');return}if(!confirm(`Delete ${selectedEmployeeIds.size} selected employee(s)?`))return;const ids=[...selectedEmployeeIds];db.employees=db.employees.filter(employee=>!ids.includes(employee.id));db.attendance=db.attendance.filter(record=>!ids.includes(record.emp));ids.forEach(id=>delete db.leaveBalances[id]);addAudit('Employees deleted',`${ids.length} employees`);selectedEmployeeIds.clear();save();renderAll();toast('Selected employees deleted')}
function downloadTableCsv(tableId,fileName){const table=document.getElementById(tableId);if(!table){toast('Table not available');return}const rows=[...table.querySelectorAll('tr')].map(row=>[...row.cells].map(cell=>cell.innerText.trim()));const blob=new Blob([rows.map(row=>row.map(value=>`"${value.replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=fileName;link.click();URL.revokeObjectURL(url)}
function setupTableActions(){const tables=[['attendanceBody','attendanceTable','attendance.csv'],['employeesBody','employeesTable','employees.csv'],['payrollBody','payrollTable','payroll.csv'],['leaveBody','leaveTable','leave-requests.csv'],['auditBody','auditTable','audit-log.csv']];tables.forEach(([bodyId,tableId,fileName])=>{const body=document.getElementById(bodyId),table=body?.closest('table');if(!table)return;table.id=tableId;const page=table.closest('.page'),actions=page?.querySelector('.page-head .actions');if(actions&&!actions.querySelector(`[data-download-table="${tableId}"]`))actions.insertAdjacentHTML('afterbegin',`<button class="btn" data-download-table="${tableId}" title="Download CSV" aria-label="Download CSV" onclick="downloadTableCsv('${tableId}','${fileName}')">⇩ Download</button>`)})}
function clearReportFilters(){document.getElementById('reportSearch').value='';document.getElementById('reportFrom').value='';document.getElementById('reportTo').value='';document.getElementById('reportDept').value='';document.getElementById('reportStatus').value='';renderReports()}
function downloadReport(){const rows=getReportRows(),data=[['Date','Employee','Department','Status','Hours','Pay','Location'],...rows.map(record=>[record.date,emp(record.emp)?.name||record.emp,emp(record.emp)?.dept||'',record.status,hours(record).toFixed(2),pay(record).toFixed(2),record.location||''])];const blob=new Blob([data.map(row=>row.map(value=>`"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`attendance-report-${todayISO()}.csv`;link.click();URL.revokeObjectURL(url)}
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
function saveSettings(){if(!canPerform(['admin']))return;
 db.settings.timeMode=document.getElementById('timeMode').value==='24'?'24':'12';
 db.settings.workingDays=Math.max(1,Math.min(7,Number(document.getElementById('workingDays').value)||5));
 save();renderAll();toast('Settings saved')
}
function updateConnectionStatus(){const banner=document.getElementById('connectionBanner');if(!banner)return;banner.textContent=navigator.onLine?'':'You are offline. Changes are stored locally and will sync when connected.';banner.classList.toggle('visible',!navigator.onLine)}
window.addEventListener('online',updateConnectionStatus);window.addEventListener('offline',updateConnectionStatus);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
document.getElementById('aDate').value=todayISO();
setupReportControls();
setupEmployeeBulkControls();
setupTableActions();
document.getElementById('selfEmployee').onchange=()=>{renderSelfService();normalizeSelfPortalTables();renderModernSelfCalendar(db.attendance.filter(record=>record.emp===getSelectedSelfEmployee()?.id&&record.date.startsWith(currentMonth())))};
renderAll();
normalizeSelfPortalTables();
renderModernSelfCalendar(db.attendance.filter(record=>record.emp===getSelectedSelfEmployee()?.id&&record.date.startsWith(currentMonth())));
applyRolePermissions();
updateConnectionStatus();
