
declare global {
  namespace Express {
    interface Request {
      user?: { 
        id: number; 
        username: string; 
        email: string; 
        role?: string; 
      };
      login(user: any, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
      isAuthenticated(): boolean;
    }
  }
}

export {};
