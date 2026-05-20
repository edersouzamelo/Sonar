$url = 'https://llkdzgduchmpfwbriatv.supabase.co/rest/v1/tenders'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2R6Z2R1Y2htcGZ3YnJpYXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTk0MDQsImV4cCI6MjA4NzI3NTQwNH0.0cn1lZOekFdvwWLfunO_hVTkSdph_i7YEsJVN03NaMo'

$headers = @{
    'apikey'        = $key
    'Authorization' = "Bearer $key"
    'Content-Type'  = 'application/json'
    'Prefer'        = 'return=minimal'
}

# Corrigir status='pending' -> 'FASE INTERNA NA OMDS'
# e current_stage='Fase Interna' -> 'FASE INTERNA NA OMDS' (status) é suficiente
$body = '{"status":"FASE INTERNA NA OMDS","current_stage":"1. Entrada do TR na SAL","uasg":"160136","department":"18\u00ba B Trnp"}'

try {
    $resp = Invoke-RestMethod -Uri "$url`?status=eq.pending" -Method Patch -Headers $headers -Body $body
    Write-Host "Status corrigido com sucesso!"
}
catch {
    Write-Host "Erro: $($_.ErrorDetails.Message)"
}
