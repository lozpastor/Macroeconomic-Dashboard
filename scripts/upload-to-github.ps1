param(
    [string]$Owner = "lozpastor",
    [string]$Repo = "Macroeconomic-Dashboard",
    [string]$Branch = "main",
    [string]$Message = "Build macroeconomic intelligence platform",
    [string]$Token = $env:GITHUB_TOKEN
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
    throw "Missing GitHub token. Set `$env:GITHUB_TOKEN or pass -Token. The token needs write access to $Owner/$Repo."
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ApiBase = "https://api.github.com/repos/$Owner/$Repo"
$Headers = @{
    Authorization          = "Bearer $Token"
    Accept                 = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent"           = "macroscope-upload-script"
}

function Invoke-GitHub {
    param(
        [string]$Method,
        [string]$Uri,
        $Body = $null
    )

    $Params = @{
        Method  = $Method
        Uri     = $Uri
        Headers = $Headers
    }

    if ($null -ne $Body) {
        $Params.Body = ($Body | ConvertTo-Json -Depth 20)
        $Params.ContentType = "application/json"
    }

    Invoke-RestMethod @Params
}

function Try-GitHub {
    param(
        [string]$Method,
        [string]$Uri,
        $Body = $null
    )

    try {
        Invoke-GitHub -Method $Method -Uri $Uri -Body $Body
    }
    catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(404, 409, 422)) {
            return $null
        }
        throw
    }
}

Write-Host "Checking repository $Owner/$Repo..."
$repoInfo = Invoke-GitHub -Method GET -Uri $ApiBase
if (-not $Branch -and $repoInfo.default_branch) {
    $Branch = $repoInfo.default_branch
}

Write-Host "Resolving branch $Branch..."
$ref = Try-GitHub -Method GET -Uri "$ApiBase/git/ref/heads/$Branch"
$baseTree = $null
$parentCommit = $null

if ($ref) {
    $parentCommit = $ref.object.sha
    $commit = Invoke-GitHub -Method GET -Uri "$ApiBase/git/commits/$parentCommit"
    $baseTree = $commit.tree.sha
    Write-Host "Branch exists. Parent commit: $parentCommit"
}
else {
    Write-Host "Branch does not exist yet. A new $Branch branch will be created."
}

$ExcludedDirs = @(".git", "node_modules", ".next", ".venv", "__pycache__", ".pytest_cache", "coverage", "htmlcov")
$ExcludedFiles = @("package-lock.json")

$files = Get-ChildItem -Path $Root -Recurse -File -Force | Where-Object {
    $relative = [System.IO.Path]::GetRelativePath($Root, $_.FullName).Replace("\", "/")
    $parts = $relative -split "/"
    -not ($parts | Where-Object { $ExcludedDirs -contains $_ }) -and
    -not ($ExcludedFiles -contains $_.Name) -and
    -not ($relative -like "scripts/upload-to-github.ps1")
}

Write-Host "Uploading $($files.Count) files as Git blobs..."
$treeItems = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
    $relativePath = [System.IO.Path]::GetRelativePath($Root, $file.FullName).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = [Convert]::ToBase64String($bytes)
    $blob = Invoke-GitHub -Method POST -Uri "$ApiBase/git/blobs" -Body @{
        content  = $content
        encoding = "base64"
    }
    $treeItems.Add(@{
        path = $relativePath
        mode = "100644"
        type = "blob"
        sha  = $blob.sha
    })
    Write-Host "  $relativePath"
}

$treeBody = @{
    tree = $treeItems
}
if ($baseTree) {
    $treeBody.base_tree = $baseTree
}

Write-Host "Creating tree..."
$tree = Invoke-GitHub -Method POST -Uri "$ApiBase/git/trees" -Body $treeBody

$commitBody = @{
    message = $Message
    tree    = $tree.sha
}
if ($parentCommit) {
    $commitBody.parents = @($parentCommit)
}

Write-Host "Creating commit..."
$newCommit = Invoke-GitHub -Method POST -Uri "$ApiBase/git/commits" -Body $commitBody

if ($ref) {
    Write-Host "Updating branch ref..."
    Invoke-GitHub -Method PATCH -Uri "$ApiBase/git/refs/heads/$Branch" -Body @{
        sha   = $newCommit.sha
        force = $false
    } | Out-Null
}
else {
    Write-Host "Creating branch ref..."
    Invoke-GitHub -Method POST -Uri "$ApiBase/git/refs" -Body @{
        ref = "refs/heads/$Branch"
        sha = $newCommit.sha
    } | Out-Null
}

Write-Host "Done: https://github.com/$Owner/$Repo/commit/$($newCommit.sha)"
