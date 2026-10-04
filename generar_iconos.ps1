# Genera los iconos de la PWA (icon-192, icon-512, maskable, apple-touch-icon, favicon)
# Uso:  powershell -ExecutionPolicy Bypass -File generar_iconos.ps1
# El diseño es manual (post-it amarillo + banda roja de festivo + 4 post-its con su prioridad),
# así que no depende de fuentes ni de emojis del sistema.

Add-Type -AssemblyName System.Drawing

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

function C([int]$r, [int]$g, [int]$b){
  [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function New-Icon([int]$size, [double]$scale, [string]$file){
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $brushBg      = New-Object System.Drawing.SolidBrush((C 255 242 168))   # amarillo claro
  $brushRojo    = New-Object System.Drawing.SolidBrush((C 220 38 38))     # festivo
  $brushBlanco  = New-Object System.Drawing.SolidBrush((C 255 255 255))
  $brushBorde   = New-Object System.Drawing.Pen((C 227 231 236), 4)

  $g.Clear($brushBg.Color)

  # lienzo de referencia 512x512 (para la versión maskable se reduce al centro)
  $off = ($size - 512 * $scale) / 2
  $g.TranslateTransform($off, $off)
  $g.ScaleTransform($scale, $scale)

  # banda roja superior (día festivo)
  $g.FillRectangle($brushRojo, 0, 0, 512, 132)

  # anillas de la agenda
  foreach ($x in @(128, 320)) {
    $g.FillEllipse($brushBlanco, $x, 34, 72, 72)
    $g.FillEllipse($brushBg,     $x + 22, 56, 28, 28)
  }

  # tarjeta blanca
  $g.FillRectangle($brushBlanco, 56, 168, 400, 300)
  $g.DrawRectangle($brushBorde,  56, 168, 400, 300)

  # cuatro post-its con su círculo de prioridad
  $colores = @(
    @(255, 214, 226),   # rosa
    @(211, 245, 219),   # verde
    @(207, 231, 255),   # azul
    @(255, 221, 184)    # naranja
  )
  $prios = @(
    @(34, 197, 94),     # verde   (baja)
    @(249, 115, 22),    # naranja (media)
    @(239, 68, 68),     # rojo    (alta)
    @(34, 197, 94)
  )

  for ($i = 0; $i -lt 2; $i++) {
    for ($j = 0; $j -lt 2; $j++) {
      $n = $i + $j * 2
      $x = 80 + $i * 184
      $y = 196 + $j * 134
      $b = New-Object System.Drawing.SolidBrush((C $colores[$n][0] $colores[$n][1] $colores[$n][2]))
      $g.FillRectangle($b, $x, $y, 168, 118)
      $b.Dispose()

      $dot = New-Object System.Drawing.SolidBrush((C $prios[$n][0] $prios[$n][1] $prios[$n][2]))
      $g.FillEllipse($dot, $x + 16, $y + 16, 24, 24)
      $dot.Dispose()

      # "texto" del post-it
      $linea = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
      $g.FillRectangle($linea, $x + 16, $y + 58, 120, 10)
      $g.FillRectangle($linea, $x + 16, $y + 78, 84, 10)
      $linea.Dispose()
    }
  }

  $path = Join-Path $dir $file
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $brushBg.Dispose(); $brushRojo.Dispose(); $brushBlanco.Dispose(); $brushBorde.Dispose()
  $g.Dispose(); $bmp.Dispose()
  Write-Output ("  " + $file)
}

Write-Output "Generando iconos de la PWA:"
New-Icon 512 1.00  'icon-512.png'
New-Icon 192 0.375 'icon-192.png'
New-Icon 512 0.72  'icon-maskable-512.png'
New-Icon 180 0.3515625 'apple-touch-icon.png'
New-Icon 64  0.125 'favicon.png'
Write-Output "Listo."
