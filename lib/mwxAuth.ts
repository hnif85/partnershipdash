class MWXAuth {
  private token: string | null = null;

  public async ensureAuthenticated(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    const url = 'https://api-mwxmarket.mwxmarket.ai/auth-service/token/auth';
    const body = {
      app_name: 'mwx-marketplace',
      app_key: 'mWX-m4Rk3TpL@c3',
      device_id: 'postman-fadil',
      device_type: '00031312',
      ip_address: '0.0.0.0',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.response.code !== '00') {
        throw new Error(`Authentication error: ${data.response.message_en || 'Unknown error'}`);
      }

      const token = data.response.data.token;
      this.token = token;
      return token;
    } catch (error) {
      throw new Error(`Failed to authenticate: ${(error as Error).message}`);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isTokenValid(): boolean {
    return !!this.token;
  }

  public clearTokens(): void {
    this.token = null;
  }

  public async backOfficeLogin(credentials: { identifier: string; password: string }): Promise<any> {
    const token = await this.ensureAuthenticated();

    const url = 'https://api-mwxmarket.mwxmarket.ai/auth-service/authentication/back-office/login';
    const body = {
      identifier: credentials.identifier,
      password: credentials.password,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.response.code !== '00') {
        throw new Error(`Login error: ${data.response.message_en || 'Unknown error'}`);
      }

      // Update token to the session token from login
      const sessionToken = data.response.data.token;
      this.token = sessionToken;

      // Return the full response including message_en
      return data.response;
    } catch (error) {
      throw new Error(`Failed to login: ${(error as Error).message}`);
    }
  }
}

export const mwxAuth = new MWXAuth();
