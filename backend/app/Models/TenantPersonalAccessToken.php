<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken;

/**
 * Sanctum token model that follows whichever database connection is
 * currently active, so tokens for tenant users are stored in (and looked
 * up from) that tenant's own database rather than the central one.
 */
class TenantPersonalAccessToken extends PersonalAccessToken
{
    protected $table = 'personal_access_tokens';

    public function getConnectionName()
    {
        return app()->bound('currentCompany') ? 'company' : parent::getConnectionName();
    }
}
