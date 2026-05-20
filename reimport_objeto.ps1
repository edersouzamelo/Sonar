Add-Type -AssemblyName Microsoft.VisualBasic

$supabaseUrl = 'https://llkdzgduchmpfwbriatv.supabase.co'
$anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2R6Z2R1Y2htcGZ3YnJpYXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTk0MDQsImV4cCI6MjA4NzI3NTQwNH0.0cn1lZOekFdvwWLfunO_hVTkSdph_i7YEsJVN03NaMo'

$hdrs = @{
    'apikey'        = $anonKey
    'Authorization' = "Bearer $anonKey"
    'Content-Type'  = 'application/json'
    'Prefer'        = 'return=minimal'
}

# ── 1. APAGAR TUDO ──────────────────────────────────────────
Write-Host "Apagando todos os registros de tenders..."
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tenders?id=neq.XXXNULLXXX" -Method Delete -Headers $hdrs
Write-Host "Banco limpo."

# ── 2. BAIXAR CSV ───────────────────────────────────────────
Write-Host "Baixando CSV..."
$csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQqiUm0-JqAqax-iXXa0ms9-iaQRGq7LRfFn7l9jMZMUu7oX_vrAvPBaucHNxFqH-p4RVNKfw1qTX9q/pub?output=csv'
$csvContent = (Invoke-WebRequest -Uri $csvUrl -UseBasicParsing).Content
Write-Host "CSV baixado."

# ── 3. PARSEAR COM TEXTFIELDPARSER (suporta campos multi-linha) ─
$reader = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser(
    [System.IO.StringReader]::new($csvContent)
)
$reader.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
$reader.SetDelimiters(',')
$reader.HasFieldsEnclosedInQuotes = $true

$physicalRow = 0
$dataRows = @()

while (-not $reader.EndOfData) {
    $fields = $reader.ReadFields()
    $physicalRow++
    # Linhas 1 e 2: títulos; linha 3: cabeçalho; linhas 4-101: dados
    if ($physicalRow -le 3) { continue }
    if ($physicalRow -gt 101) { break }
    $dataRows += , $fields   # coluna 2 (índice 2) = Objeto
}
$reader.Close()

Write-Host "Linhas de dados lidas: $($dataRows.Count)"

# ── 4. INSERIR OS 98 REGISTROS ──────────────────────────────
$batch = @()
for ($i = 0; $i -lt $dataRows.Count; $i++) {
    $fields = $dataRows[$i]
    $nr = if ($fields.Count -gt 0) { $fields[0].Trim() } else { '' }
    $obj = if ($fields.Count -gt 2) { $fields[2].Trim() } else { '' }
    if ([string]::IsNullOrWhiteSpace($nr) -or $nr -eq '-') { $nr = 'A definir' }

    $batch += @{
        id            = "row-$($i+1)"
        number        = $nr
        description   = $obj
        status        = 'pending'
        current_stage = 'Fase Interna'
    }
}

$body = $batch | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tenders" -Method Post -Headers $hdrs -Body $body

Write-Host "Importados $($batch.Count) registros com sucesso!"
