<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->string('edit_token', 64)->nullable()->after('status')->index();
        });
    }

    public function down(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->dropColumn('edit_token');
        });
    }
};
