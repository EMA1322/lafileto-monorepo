<#
SEC-04 local secret prevention.
Requires the official Gitleaks CLI v8.30.1 in PATH. It scans new commits and,
independently, the complete staged Git index with full redaction. It does not rewrite
history, create a baseline, fetch, download binaries, or change the Git index.
GitHub Secret Scanning and Push Protection are enabled manually in repository settings.
Husky integration is deferred to OPT-07.
#>

$ErrorActionPreference = 'Stop'

function Fail-Scan {
    param([string]$Message, [int]$ExitCode = 1)

    Write-Host "FAIL: $Message"
    Write-Host 'Fix: remove and rotate any real credential, then rerun pnpm secrets:scan.'
    exit $ExitCode
}

function Invoke-GitleaksQuietly {
    param([string[]]$Arguments)

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $null = & $script:GitleaksCommand.Source @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference
    return $exitCode
}

function Test-HasStagedChanges {
    & git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        return $false
    }

    if ($LASTEXITCODE -eq 1) {
        return $true
    }

    Fail-Scan 'Could not inspect the staged Git index.'
}

try {
    $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    Set-Location $repositoryRoot

    $script:GitleaksCommand = Get-Command gitleaks -ErrorAction SilentlyContinue
    if ($null -eq $script:GitleaksCommand) {
        Fail-Scan 'Gitleaks was not found in PATH.'
    }

    $versionOutput = & $script:GitleaksCommand.Source version 2>&1
    $versionExitCode = $LASTEXITCODE
    $version = ($versionOutput | Out-String).Trim()
    if ($versionExitCode -ne 0) {
        Fail-Scan 'Could not determine the installed Gitleaks version.'
    }

    if ($version -notmatch '^(?:v)?8\.30\.1$') {
        Fail-Scan "Gitleaks v8.30.1 is required; found '$version'."
    }

    $originMain = & git rev-parse --verify --quiet 'origin/main^{commit}' 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($originMain)) {
        Fail-Scan 'origin/main is unavailable. Fetch it manually before scanning.'
    }

    $mergeBase = & git merge-base origin/main HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($mergeBase)) {
        Fail-Scan 'Could not calculate the merge-base between origin/main and HEAD.'
    }

    $configPath = Join-Path $repositoryRoot '.gitleaks.toml'
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
        Fail-Scan '.gitleaks.toml was not found at the repository root.'
    }

    $range = "$($mergeBase.Trim())..HEAD"
    $commitCount = & git rev-list --count $range 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commitCount)) {
        Fail-Scan 'Could not count commits introduced by this branch.'
    }

    Write-Host "Gitleaks version validated: $version"
    Write-Host "Base reference: $($mergeBase.Trim())"

    $overallExitCode = 0
    if ([int]$commitCount -gt 0) {
        Write-Host "Commit scan: running ($range)"
        $commitExitCode = Invoke-GitleaksQuietly -Arguments @('git', '--config', $configPath, '--redact=100', "--log-opts=$range")
        if ($commitExitCode -ne 0) {
            $overallExitCode = $commitExitCode
            Write-Host 'Commit scan: FAIL'
        }
        else {
            Write-Host 'Commit scan: PASS'
        }
    }
    else {
        Write-Host 'Commit scan: skipped (no commits newer than origin/main)'
    }

    if (Test-HasStagedChanges) {
        $snapshotRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("lafileto-gitleaks-index-" + [System.Guid]::NewGuid().ToString('N'))
        try {
            New-Item -ItemType Directory -Path $snapshotRoot -Force | Out-Null
            $snapshotPrefix = $snapshotRoot + [System.IO.Path]::DirectorySeparatorChar
            & git checkout-index --all --prefix=$snapshotPrefix
            if ($LASTEXITCODE -ne 0) {
                Fail-Scan 'Could not export the staged Git index safely.'
            }

            Write-Host 'Staged scan: running (complete staged index snapshot)'
            $stagedExitCode = Invoke-GitleaksQuietly -Arguments @('dir', '--config', $configPath, '--redact=100', $snapshotRoot)
            if ($stagedExitCode -ne 0) {
                if ($overallExitCode -eq 0) {
                    $overallExitCode = $stagedExitCode
                }
                Write-Host 'Staged scan: FAIL'
            }
            else {
                Write-Host 'Staged scan: PASS'
            }
        }
        finally {
            if ($snapshotRoot -and (Test-Path -LiteralPath $snapshotRoot)) {
                Remove-Item -LiteralPath $snapshotRoot -Recurse -Force
            }
        }
    }
    else {
        Write-Host 'Staged scan: skipped (no staged changes)'
    }

    if ($overallExitCode -ne 0) {
        Write-Host 'FAIL: Secret findings or a Gitleaks error occurred. No finding values are printed by this wrapper.'
        exit $overallExitCode
    }

    Write-Host 'PASS: All applicable commit and staged scans completed without findings.'
    exit 0
}
catch {
    Fail-Scan 'The secret scan could not be completed safely.'
}
