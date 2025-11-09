export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateUserId(userId: string | null): string {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new ValidationError('Invalid user ID format');
  }
  if (userId.length > 100) {
    throw new ValidationError('User ID too long');
  }
  return userId;
}

export function validateUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required');
  }
  if (username.length < 3) {
    throw new ValidationError('Username must be at least 3 characters');
  }
  if (username.length > 20) {
    throw new ValidationError('Username must be less than 20 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ValidationError('Username can only contain letters, numbers, and underscores');
  }
  return username.trim();
}

export function validateEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }
  if (typeof email !== 'string') {
    throw new ValidationError('Invalid email format');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
  if (email.length > 100) {
    throw new ValidationError('Email too long');
  }
  return email.trim();
}

export function validateProductId(productId: string): string {
  if (!productId || typeof productId !== 'string') {
    throw new ValidationError('Product ID is required');
  }
  if (!productId.startsWith('com.idleadventure.')) {
    throw new ValidationError('Invalid product ID format');
  }
  return productId;
}

export function validateAmount(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new ValidationError('Invalid amount');
  }
  if (amount < 0) {
    throw new ValidationError('Amount cannot be negative');
  }
  if (amount > 10000) {
    throw new ValidationError('Amount too large');
  }
  return amount;
}

export function validateTransactionId(transactionId: string): string {
  if (!transactionId || typeof transactionId !== 'string') {
    throw new ValidationError('Transaction ID is required');
  }
  if (transactionId.length > 200) {
    throw new ValidationError('Transaction ID too long');
  }
  return transactionId;
}


