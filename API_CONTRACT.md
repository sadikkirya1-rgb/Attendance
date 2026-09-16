# SmartAttend Frontend API Contract

The current frontend uses `localStorage` through `db`. A backend adapter should preserve these shapes while replacing local reads and writes.

## Authentication and roles

`GET /api/session`

```json
{
  "user": { "id": "USR-001", "name": "Administrator", "role": "admin" },
  "companyId": "COMP-001"
}
```

Roles used by the frontend: `admin`, `manager`, `payroll`, and `employee`.

## Core resources

- `GET/POST/PATCH /api/employees`
- `GET/POST/PATCH /api/attendance`
- `GET/POST /api/attendance/corrections`
- `POST /api/attendance/corrections/:id/decision`
- `GET/POST/PATCH /api/shifts`
- `GET/POST /api/schedules`
- `GET/POST/PATCH /api/leaves`
- `POST /api/leaves/:id/decision`
- `GET/POST /api/holidays`
- `GET /api/payroll/periods/:month`
- `POST /api/payroll/periods/:month/lock`
- `POST /api/payroll/periods/:month/finalize`
- `GET /api/payroll/periods/:month/export`
- `GET /api/payroll/payslips/:employeeId/:month`
- `GET /api/notifications`
- `POST /api/notifications/read`
- `GET /api/audit`

## Important entity shapes

### Employee

```json
{
  "id": "EMP-001",
  "name": "Alex Morgan",
  "department": "Engineering",
  "email": "alex.morgan@company.com",
  "location": "Main Office",
  "phone": "+971 50 111 2200",
  "status": "Active",
  "workingHours": 8,
  "startTime": "09:00",
  "endTime": "17:00",
  "basicSalary": 4200,
  "allowance": 800,
  "monthlySalary": 5000,
  "monthlyBonus": 0,
  "monthlyDeduction": 0
}
```

### Attendance record

```json
{
  "id": "ATT-001",
  "employeeId": "EMP-001",
  "date": "2026-09-16",
  "checkIn": "08:57",
  "checkOut": "17:04",
  "method": "QR",
  "location": "Main Office",
  "status": "Present"
}
```

### Approval decision

```json
{
  "status": "Approved",
  "comment": "Reviewed by manager",
  "decidedBy": "USR-002",
  "decidedAt": "2026-09-16T10:30:00Z"
}
```

### Payroll period

```json
{
  "month": "2026-09",
  "status": "Open",
  "baseSalary": 9800,
  "overtime": 420,
  "deductions": 0,
  "bonuses": 0,
  "total": 10220,
  "lockedAt": null,
  "finalizedAt": null
}
```

Payroll responses should expose `paidLeaveDays`, `paidLeaveSalary`, `unpaidLeaveDays`, `unpaidLeaveDeduction`, `overtimePay`, `bonus`, `deduction`, and `totalPay`. Paid leave is itemized within monthly salary; approved unpaid leave reduces total pay.

## Backend rules expected by the UI

- Every write must be permission-checked server-side; hidden frontend controls are not security.
- Attendance corrections, overtime, leave, payroll locking, and finalization must be auditable.
- Payroll transitions are `Open -> Locked -> Finalized`; finalized periods cannot be edited.
- Leave requests must reject overlapping dates and insufficient balances.
- Overtime must use the employee's configured working-hours threshold and weekend rules.
- All list endpoints should support pagination, search, filters, and stable sorting.
- Dates and stored times should use ISO-compatible values; the frontend formats 12/24-hour display locally.
