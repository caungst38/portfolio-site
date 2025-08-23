Param(
  [string]$IndexPath = ".\index.html",
  [switch]$Backup
)

if (-not (Test-Path $IndexPath)) {
  Write-Error "index.html not found at $IndexPath"
  exit 1
}

$orig = Get-Content -Raw -Path $IndexPath

if ($Backup) {
  Copy-Item $IndexPath "$IndexPath.bak" -Force
}

# Define new picture block
$new = @"
<picture class="about-photo">
  <source srcset="assets/images/about-photo.webp 1x, assets/images/about-photo@2x.webp 2x" type="image/webp" />
  <img src="assets/images/about-photo.png" alt="About photo" loading="lazy" class="rounded-2xl" />
</picture>
"@.Trim()

# Replace the existing <picture class="about-photo">...</picture> block (single occurrence)
$pattern = '(?s)<picture\s+class=["'"]about-photo["'"][^>]*>.*?</picture>'
if ($orig -match $pattern) {
  $updated = [regex]::Replace($orig, $pattern, [System.Text.RegularExpressions.RegexEscape]($new))
  # Unescape because we escaped content for regex safety
  $updated = $updated -replace '\\<','<' -replace '\\>','>' -replace '\\"','"' -replace "\\'", "'"
  Set-Content -Path $IndexPath -Value $updated -NoNewline
  Write-Host "Patched: About photo block updated. Hero headshot left unchanged." -ForegroundColor Green
} else {
  Write-Warning "Could not find <picture class=""about-photo""> block in index.html. No changes applied."
}