<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submission_events', function (Blueprint $table) {
            $table->json('snapshot')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('submission_events', function (Blueprint $table) {
            $table->dropColumn('snapshot');
        });
    }
};
