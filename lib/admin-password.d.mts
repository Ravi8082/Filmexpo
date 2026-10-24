export function hashAdminPassword(password: string): Promise<string>
export function verifyAdminPassword(password: string, stored: string): Promise<boolean>
export function isValidAdminEmail(email: string): boolean
export function isValidAdminPassword(password: string): boolean
