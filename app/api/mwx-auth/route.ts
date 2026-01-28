import { NextRequest, NextResponse } from "next/server";
import { mwxAuth } from "@/lib/mwxAuth";

export async function GET() {
  try {
    // Test authentication and return current token status
    const isValid = mwxAuth.isTokenValid();
    const token = mwxAuth.getToken();

    return NextResponse.json({
      status: "success",
      token_valid: isValid,
      has_token: !!token,
      token_preview: token ? `${token.substring(0, 20)}...` : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if this is a token generation request (body contains app credentials)
    const body = await request.json();

    // If body contains app_name, it's a token generation request
    if (body.app_name && body.app_key) {
      // Generate token using the MWX auth service
      const token = await mwxAuth.ensureAuthenticated();

      // Create response
      const response = NextResponse.json({
        status: "success",
        message: "Token generated successfully",
        token: token,
      });

      // Set token in a secure httpOnly cookie
      response.cookies.set('mwx_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    }

    // Otherwise, handle back office login
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        {
          status: "error",
          message: "Identifier and password are required",
        },
        { status: 400 }
      );
    }

    // Get the token from cookies (should be set from previous token generation)
    const cookies = request.cookies;
    const existingToken = cookies.get('mwx_token')?.value;

    if (!existingToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "No token found. Please generate token first.",
        },
        { status: 400 }
      );
    }

    // Perform back office login directly (not through MWXAuth instance)
    const url = 'https://api-mwxmarket.mwxmarket.ai/auth-service/authentication/back-office/login';
    const loginBody = {
      identifier: identifier,
      password: password,
    };

    try {
      const loginResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': existingToken,
        },
        body: JSON.stringify(loginBody),
      });

      if (!loginResponse.ok) {
        throw new Error(`HTTP error: ${loginResponse.status} ${loginResponse.statusText}`);
      }

      const loginData: any = await loginResponse.json();

      if (loginData.response.code !== '00') {
        throw new Error(`Login error: ${loginData.response.message_en || 'Unknown error'}`);
      }

      // Create response
      const response = NextResponse.json({
        status: "success",
        message: "Back office login successful",
        data: loginData.response.data,
        message_en: loginData.response.message_en,
      });

      // Keep the original token from token generation API
      // Don't update mwx_token - we keep using the original token for external API calls

      // Set message_en in a separate cookie
      response.cookies.set('mwx_message', loginData.response.message_en || 'Success', {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    } catch (error) {
      return NextResponse.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Login failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Login failed",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    mwxAuth.clearTokens();

    // Clear the cookie
    const response = NextResponse.json({
      status: "success",
      message: "Tokens cleared",
    });

    response.cookies.set('mwx_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to clear tokens",
      },
      { status: 500 }
    );
  }
}
