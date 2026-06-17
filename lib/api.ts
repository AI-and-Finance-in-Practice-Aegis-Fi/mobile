export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-production-3353.up.railway.app';

export const API = {
  employeeProfile: (employeeId: number) =>
    `${BASE_URL}/api/v1/employees/${employeeId}`,
  transactions: (employeeId: number) =>
    `${BASE_URL}/api/v1/transactions?employee_id=${employeeId}`,
  requestPayment: `${BASE_URL}/api/v1/transactions/request`,
  requestApproval: (transactionId: number) =>
    `${BASE_URL}/api/v1/approvals/${transactionId}/request`,
  transactionStream: () =>
    `${BASE_URL}/api/v1/realtime/transactions`,
};
