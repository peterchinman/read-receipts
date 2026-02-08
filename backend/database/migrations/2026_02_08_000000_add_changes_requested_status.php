<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->string('status')->default('submitted')->change();
        });

        Schema::table('submission_events', function (Blueprint $table) {
            $table->string('event_type')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->enum('status', ['submitted', 'accepted', 'published', 'rejected'])->default('submitted')->change();
        });

        Schema::table('submission_events', function (Blueprint $table) {
            $table->enum('event_type', ['submitted', 'accepted', 'rejected', 'published'])->change();
        });
    }
};
