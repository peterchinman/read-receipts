<?php

namespace App\Policies;

use App\Models\Thread;
use App\Models\User;

class ThreadPolicy
{
    public function view(User $user, Thread $thread): bool
    {
        return $user->id === $thread->user_id || $user->is_admin;
    }

    public function update(User $user, Thread $thread): bool
    {
        return $user->id === $thread->user_id;
    }

    public function delete(User $user, Thread $thread): bool
    {
        return $user->id === $thread->user_id;
    }
}
