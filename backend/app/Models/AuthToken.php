<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $user_id
 * @property string $token
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $used_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $user
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereExpiresAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereUsedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|AuthToken whereUserId($value)
 * @mixin \Eloquent
 */
class AuthToken extends Model
{
    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function generateFor(User $user, int $expiresInMinutes = 30): self
    {
        return self::create([
            'user_id' => $user->id,
            'token' => Str::random(64),
            'expires_at' => now()->addMinutes($expiresInMinutes),
        ]);
    }

    public function isValid(): bool
    {
        return !$this->used_at && $this->expires_at->isFuture();
    }

    public function markAsUsed(): void
    {
        $this->update(['used_at' => now()]);
    }
}
