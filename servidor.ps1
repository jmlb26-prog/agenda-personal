# Servidor local mínimo para la Agenda Personal.
# Sirve esta misma carpeta por http://localhost:8787/ de forma que el
# navegador pueda leer y escribir datos.json automáticamente.
# Se arranca desde abrir_agenda.bat  (no hace falta instalar nada).

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8787

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
  $listener.Start()
} catch {
  # El puerto ya está en uso: ya hay otra instancia corriendo.
  Write-Host "El servidor ya esta en marcha en el puerto $port."
  exit 0
}

Write-Host "Agenda Personal servida en http://localhost:$port/"
Write-Host "Carpeta: $root"
Write-Host "Pulsa Ctrl+C para detener."

while ($true) {
  $ctx = $listener.GetContext()
  try {
    $path = $ctx.Request.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $file = Join-Path $root $path
    $full = [IO.Path]::GetFullPath($file)
    if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      switch ([IO.Path]::GetExtension($full).ToLower()) {
        '.html' { $ctx.Response.ContentType = 'text/html; charset=utf-8' }
        '.css'  { $ctx.Response.ContentType = 'text/css; charset=utf-8' }
        '.js'   { $ctx.Response.ContentType = 'application/javascript; charset=utf-8' }
        '.json' { $ctx.Response.ContentType = 'application/json; charset=utf-8' }
        '.bat'  { $ctx.Response.ContentType = 'text/plain; charset=utf-8' }
        '.ps1'  { $ctx.Response.ContentType = 'text/plain; charset=utf-8' }
        default { $ctx.Response.ContentType = 'application/octet-stream' }
      }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes('No encontrado')
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch {}
  } finally {
    try { $ctx.Response.Close() } catch {}
  }
}
