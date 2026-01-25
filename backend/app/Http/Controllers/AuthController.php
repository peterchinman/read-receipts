<?php

namespace App\Http\Controllers;

use App\Mail\MagicLinkMail;
use App\Models\AuthToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function requestMagicLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::firstOrCreate(
            ['email' => $request->email],
            ['name' => explode('@', $request->email)[0]]
        );

        $authToken = AuthToken::generateFor($user);

        Mail::to($user->email)->send(new MagicLinkMail($authToken));

        return response()->json([
            'message' => 'Magic link sent to your email',
        ]);
    }

    public function verifyToken(Request $request, string $token)
    {
        $authToken = AuthToken::where('token', $token)->first();

        if (!$authToken || !$authToken->isValid()) {
            return response()->json([
                'error' => 'Invalid or expired token',
            ], 401);
        }

        $authToken->markAsUsed();

        $user = $authToken->user;
        $user->email_verified_at = now();
        $user->save();

        $apiToken = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'display_name' => $user->display_name,
                'is_admin' => $user->is_admin,
            ],
            'token' => $apiToken,
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'display_name' => $user->display_name,
            'is_admin' => $user->is_admin,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }
}
