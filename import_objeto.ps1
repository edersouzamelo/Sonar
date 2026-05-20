$url = 'https://llkdzgduchmpfwbriatv.supabase.co/rest/v1/tenders'
$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsa2R6Z2R1Y2htcGZ3YnJpYXR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTk0MDQsImV4cCI6MjA4NzI3NTQwNH0.0cn1lZOekFdvwWLfunO_hVTkSdph_i7YEsJVN03NaMo'
$headers = @{
    'apikey'        = $key
    'Authorization' = "Bearer $key"
    'Content-Type'  = 'application/json'
    'Prefer'        = 'resolution=merge-duplicates,return=minimal'
}

$rows = @(
    @{ id='tender-900012-2025'; number='900012/2025'; description='Aqs Racao Canina (1) e Equina (2)'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90013-2025';  number='90013/2025';  description='Contratacao de servicos - PASA'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90014-2025';  number='90014/2025';  description='Aqs Pc Mnt Vtr - AUDATEX'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90017-2025';  number='90017/2025';  description='Aquisicao de material permanente - PASA'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90023-2025';  number='90023/2025';  description='Aquisicao de material de consumo - PASA'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90018-2025';  number='90018/2025';  description='Aqs de material de saude (medicamentos e odonto) - Classe VIII'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90021-2025';  number='90021/2025';  description='Aqs QS 1a Provisao 2026'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90001-2026a'; number='90001/2026';  description='Aqs Material Eletrico 2026'; status='active'; current_stage='Em andamento' },
    @{ id='tender-001-2025';    number='001/2025';    description='Leilao (Alienacao de Cl IX) 65345.002700/2025-40'; status='active'; current_stage='Em andamento' },
    @{ id='tender-002-2025';    number='002/2025';    description='Leilao (Alienacao de Cl VI) 65345.004465/2025-41'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90023-2024';  number='90023/2024';  description='Sv Mnt Vtr Bld (Classe IX) NUP 65345.005212/2024-11'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90003-2026';  number='90003/2026';  description='Sv de instalacao de ponte rolante com Cap 20 Ton (Pel Mnt Vtr Bld)'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90004-2026';  number='90004/2026';  description='Aqs de cabine de pintura para a Secao de Lanternagem e Pintura'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90022-2025';  number='90022/2025';  description='Aqs de insumos para oficinas (Armamento, correaria, carpintaria, tornearia, Lanternagem e pintura)'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90016-2025';  number='90016/2025';  description='Aqs de insumos Cl IX Baterias e Oleos'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90024-2025';  number='90024/2025';  description='Sv Mnt Mat Eng (Classe VI) - NUP 65345.005019/2025-53'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90005-2026';  number='90005/2026';  description='Telhado da Cia de Transporte do 18 B Trnp'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90006-2026';  number='90006/2026';  description='Sv Mnt Vtr Nao-Blindadas NUP 65345.005020/2025-88'; status='active'; current_stage='Em andamento' },
    @{ id='tender-90002-2026';  number='90002/2026';  description='Cl IX - aquisicao de viatura para o CFMM 64136.000261/2026-14'; status='active'; current_stage='Em andamento' },
    @{ id='tender-sem-nr-bsup-qr-glp';    number='A definir'; description='Aquisicao de QR - GLP (2026) - 2a Licitacao'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-bsup-padaria';   number='A definir'; description='Aquisicao de QR - Padaria'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-bsup-hortif';    number='A definir'; description='Aquisicao de QR - Hortifruti - 2a Licitacao'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-bsup-enlat';     number='A definir'; description='Aquisicao de QR - Enlatados e Embutidos - 2a Licitacao'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-camaras-sv';     number='A definir'; description='Sv Mnt Prev e Corr Camaras Frigorificas'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-chamada-pub';    number='A definir'; description='Aquisicao de QR - Chamada Publica'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-sem-nr-coleta-sel';     number='A definir'; description='Chamada publica da Coleta Seletiva'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-pca-a-qs-bsup';         number='A definir'; description='Aquisicao de QS (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-consumo-pasa';    number='A definir'; description='Aquisicao de material de consumo - PASA (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-sv-pasa';         number='A definir'; description='Contratacao de servicos - PASA (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-perm-pasa';       number='A definir'; description='Aquisicao de material permanente - PASA (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-racao';           number='A definir'; description='Aquisicao de racao canina e equina, alfafa, aveia e feno'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-audatex';         number='A definir'; description='Aquisicao de pecas de Vtr - AUDATEX (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-a-enlatados';       number='A definir'; description='Aquisicao de QR Enlatados e Embutidos (PCA A)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-colchoes';        number='A definir'; description='Aquisicao de colchoes, armarios, beliches, cama, mesa e banho'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-eletrico';        number='A definir'; description='Aquisicao de Material Eletrico (9 BSUP PCA B)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-uniformes';       number='A definir'; description='Uniformes especiais e historicos, bandeiras e insignias'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-camaras-sv';      number='A definir'; description='Contratacao de servicos de manutencao preventiva e corretiva de camaras frigorificas'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-chamada-qs';      number='A definir'; description='Aquisicao de QR - Chamada publica (PCA B)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-b-gorro-selva';     number='A definir'; description='Aquisicao de gorro de selva'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-pcs-eng-emb';     number='A definir'; description='Aquisicao de pecas para manutencao de material de engenharia - Embarcacoes, motores de popa e geradores (Cl VI)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-sv-mnt-bld';      number='A definir'; description='Contratacao de servicos de manutencao de Vtr Bld - Servicos nao continuados (Cl IX) PCA C'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-geradores-hcmp';  number='A definir'; description='Aquisicao de geradores e equipamentos de ar condicionados - H Cmp'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-baterias-oleos';  number='A definir'; description='Aquisicao de insumos Classe IX - Baterias, oleos, filtros e graxas'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-audatex-sv';      number='A definir'; description='Contratacao de servicos Mnt de Vtr - AUDATEX (Classe IX) PCA C'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-agua-artesiana';  number='A definir'; description='Contratacao de servicos de analise e tratamento de agua - pocos artesianos (Dispensa)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-residuo-hosp';    number='A definir'; description='Contratacao de servico de coleta de residuo hospitalar (Dispensa)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-ferramental';     number='A definir'; description='Aquisicao de ferramental para oficinas e maquina de costura para correaria'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-qs-chamada';      number='A definir'; description='Aquisicao de QS - Chamada Publica (PCA C)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-pcs-bld';         number='A definir'; description='Aquisicao de pecas para manutencao de viaturas blindadas (Classe IX) PCA C'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-cabine-pintura';  number='A definir'; description='Aquisicao de cabine de pintura para a Secao de Lanternagem e Pintura (PCA C)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-ponte-rolante';   number='A definir'; description='Servico de instalacao de ponte rolante com capacidade de 20 Ton'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-pneus';           number='A definir'; description='Aquisicao de insumos Classe IX - Pneus'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-leilao-vi';       number='A definir'; description='Alienacao de bens moveis - Leilao (Classe VI)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-leilao-ix';       number='A definir'; description='Alienacao de bens moveis - Leilao (Classe IX)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-insumos-ofic';    number='A definir'; description='Aquisicao de insumos para oficinas - armamento, correaria, carpintaria, tornearia e lanternagem e pintura'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-sv-eng-emb';      number='A definir'; description='Contratacao de servicos para manutencao de material de engenharia - Embarcacoes e geradores (Cl VI)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-pcs-eng-2';       number='A definir'; description='Aquisicao de pecas para manutencao de material de engenharia (Cl VI) - 2'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-sv-bld-dup';      number='A definir'; description='Contratacao de servicos Vtr Bld nao continuados (duplicado PCA)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-leiloeiro';       number='A definir'; description='Contratacao de Leiloeiro'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-imovel-financ';   number='A definir'; description='Cessao de uso de imovel para funcionamento de Servicos Financeiros'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-imovel-cantina';  number='A definir'; description='Cessao de uso de imovel para funcionamento de Cantina'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-internet-btrnp';  number='A definir'; description='Servico de Internet dados moveis'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-esgoto-btrnp';    number='A definir'; description='Contratacao de servico para reforma/substituicao da rede interna de esgoto do 18 B Trnp'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-pca-c-reparacao-cia';   number='A definir'; description='Reparacao / Alvenaria / Reserva de Material 18 B Trnp (DISPENSA ELETRONICA)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-pecas-pall-1';   number='A definir'; description='Aquisicao de pecas para PALL - Operacao Perseu (1)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-pecas-pall-2';   number='A definir'; description='Aquisicao de pecas para PALL - Operacao Perseu (2)'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-sv-pall';        number='A definir'; description='Aquisicao de Servico para manutencao de PALL - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-pneus';          number='A definir'; description='Aquisicao de Pneus para viaturas blindadas e nao-blindadas - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-olg';            number='A definir'; description='OLG (oleos, graxas, lubrificantes e ARLA) para viaturas - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-baterias';       number='A definir'; description='Baterias para Vtr Bld, nao Blindada, Motocicleta, embarcacoes - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-tintas';         number='A definir'; description='Tintas e afins para Vtr blindadas, nao blindadas, armamentos - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-sv-vtr-nbld';    number='A definir'; description='Servicos de viaturas nao blindada e motocicleta (Honda, Yamaha, MBB...) - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-pcs-vtr-nbld';   number='A definir'; description='Pecas de viaturas nao blindada e motocicleta (Honda, Yamaha, MBB...) - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-pcs-bld';        number='A definir'; description='Pecas de viaturas blindadas: Cascavel; Guarani; M60 A3TTS e M113BR - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-sv-bld';         number='A definir'; description='Servicos de viatura blindadas: Cascavel; Guarani; M60 A3TTS e M113BR - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-prancha';        number='A definir'; description='Pecas e Servico de manutencao em VSRE Prancha e VSRNE Graneleiro - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-frig';           number='A definir'; description='Pecas e Servico de manutencao em VTE Frigorifico e Container Frigorifico - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-perseu-aluguel-vte';    number='A definir'; description='Aluguel de VTE para salvamento e evacuacao - Operacao Perseu'; status='pending'; current_stage='Planejamento' },
    @{ id='tender-nup-000650-2025';       number='A definir'; description='Aqs de Pcs Mnt de Vtr Bld (Classe IX) NUP 65345.000650/2025-66'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-nup-003175-2025';       number='A definir'; description='Sv Mnt Vtr Bld (Classe IX) NUP 65345.003175/2025-80'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-nup-insumos-eng';       number='A definir'; description='Aqs de insumos e pc para Mnt Mat Eng'; status='pending'; current_stage='Fase Interna' },
    @{ id='tender-inex-tusd-2025';        number='A definir'; description='Inexigibilidade TUSD (Energia Eletrica) NUP 65297.014405/2025-59'; status='pending'; current_stage='Fase Externa' }
)

$body = $rows | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "SUCESSO! Registros inseridos/atualizados."
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    Write-Host "ERRO HTTP $statusCode"
    Write-Host $errorBody
}
