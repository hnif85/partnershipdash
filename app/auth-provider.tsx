'use client';

import { useEffect, useState } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in cookies
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('mwx_token='));

        if (!tokenCookie) {
          // No token in cookies, generate new token
          console.log('No token found in cookies, generating new token...');

          const tokenResponse = await fetch('/api/mwx-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              app_name: "mwx-marketplace",
              app_key: "mWX-m4Rk3TpL@c3",
              device_id: "postman-fadil",
              device_type: "00031312",
              ip_address: "0.0.0.0"
            }),
          });

          if (!tokenResponse.ok) {
            throw new Error('Failed to generate token');
          }

          const tokenData = await tokenResponse.json();
          console.log('Token generated successfully:', tokenData.token ? 'Token received' : 'No token in response');

          // Now perform back office login with the generated token
          console.log('Performing back office login...');

          const loginResponse = await fetch('/api/mwx-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: process.env.NEXT_PUBLIC_MWX_IDENTIFIER || "superadmin@gmail.com",
              password: process.env.NEXT_PUBLIC_MWX_PASSWORD || "qLlROtjr2FLwxzR8"
            }),
          });

          if (!loginResponse.ok) {
            throw new Error('Failed to perform back office login');
          }

          const loginData = await loginResponse.json();

          if (loginData.message_en) {
            console.log('Back office login successful, message:', loginData.message_en);
          } else {
            console.log('Back office login successful but no message_en found');
          }
        } else {
          console.log('Token found in cookies');
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Still allow the app to load even if auth fails
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f7]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent mx-auto"></div>
          <p className="text-sm text-zinc-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
