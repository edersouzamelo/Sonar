-- ============================================================
-- IMPORTAÇÃO DA COLUNA "OBJETO" DA PLANILHA DE LICITAÇÕES
-- Fonte: Google Sheets (linhas 4-101, 98 registros)
-- Tabela destino: tenders (coluna: description)
-- Estratégia: INSERT ... ON CONFLICT (id) DO UPDATE
-- ============================================================

-- O ID na tabela tenders segue o padrão: tender-NUMERO-ANO
-- Ex: Nr do Pregão "900012/2025" → id = "tender-900012-2025"
-- Registros sem Nr de Pregão (Nr = "A definir", "-" ou em branco) 
-- recebem IDs sequenciais gerados abaixo.

BEGIN;

-- -------------------------------------------------------
-- BLOCO 1: Pregões com número definido (A-1 e A-0 PCA)
-- -------------------------------------------------------

INSERT INTO tenders (id, number, description, status, current_stage)
VALUES
  ('tender-900012-2025', '900012/2025', 'Aqs Ração Canina (1) e Equina (2)', 'active', 'Em andamento'),
  ('tender-90013-2025',  '90013/2025',  'Contratação de serviços - PASA', 'active', 'Em andamento'),
  ('tender-90014-2025',  '90014/2025',  'Aqs Pç Mnt Vtr - AUDATEX', 'active', 'Em andamento'),
  ('tender-90017-2025',  '90017/2025',  'Aquisição de material permanente - PASA', 'active', 'Em andamento'),
  ('tender-90023-2025',  '90023/2025',  'Aquisição de material de consumo - PASA', 'active', 'Em andamento'),
  ('tender-90018-2025',  '90018/2025',  'Aqs de material de saúde (medicamentos e odonto) - Classe VIII', 'active', 'Em andamento'),
  ('tender-90021-2025',  '90021/2025',  'Aqs QS 1ª Provisão 2026', 'active', 'Em andamento'),
  ('tender-90001-2026',  '90001/2026',  'Aqs Material Elétrico 2026', 'active', 'Em andamento'),
  ('tender-001-2025',    '001/2025',    'Leilão (Alienação de Cl IX) 65345.002700/2025-40', 'active', 'Em andamento'),
  ('tender-002-2025',    '002/2025',    'Leilão (Alienação de Cl VI) 65345.004465/2025-41', 'active', 'Em andamento'),
  ('tender-90023-2024',  '90023/2024',  'Sv Mnt Vtr Bld (Classe IX) NUP 65345.005212/2024-11', 'active', 'Em andamento'),
  ('tender-90003-2026',  '90003/2026',  'Sv de instalação de ponte rolante com Cap 20 Ton (Pel Mnt Vtr Bld) 65345.000226/2026-01', 'active', 'Em andamento'),
  ('tender-90004-2026',  '90004/2026',  'Aqs de cabine de pintura para a Seção de Lanternagem e Pintura 65345.000227/2026-47', 'active', 'Em andamento'),
  ('tender-90022-2025',  '90022/2025',  'Aqs de insumos para oficinas (Armamento, correaria, carpintaria, tornearia, Lanternagem e pintura)', 'active', 'Em andamento'),
  ('tender-90016-2025',  '90016/2025',  'Aqs de insumos Cl IX Baterias e Óleos', 'active', 'Em andamento'),
  ('tender-90024-2025',  '90024/2025',  'Sv Mnt Mat Eng (Classe VI) - NUP 65345.005019/2025-53', 'active', 'Em andamento'),
  ('tender-90005-2026',  '90005/2026',  'Telhado da Cia de Transporte do 18º B Trnp NUP 64136.003328/2025-91', 'active', 'Em andamento'),
  ('tender-90006-2026',  '90006/2026',  'Sv Mnt Vtr Não-Blindadas NUP 65345.005020/2025-88', 'active', 'Em andamento'),
  ('tender-90002-2026',  '90002/2026',  'Cl IX - aquisição de viatura para o Centro de Formação de Motorista Militar (CFMM) 64136.000261/2026-14', 'active', 'Em andamento')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = NOW();

-- -------------------------------------------------------
-- BLOCO 2: Registros A cargo do 9º B Sup (sem Nr Pregão)
-- Identificados pelos objetos da planilha linhas PCA A-0
-- -------------------------------------------------------

INSERT INTO tenders (id, number, description, status, current_stage)
VALUES
  ('tender-sem-nr-bsup-qr-glp-2026',     'A definir', 'Aquisição de QR - GLP (2026) - 2ª Licitação', 'pending', 'Fase Interna'),
  ('tender-sem-nr-bsup-padaria-2026',     'A definir', 'Aquisição de QR - Padaria', 'pending', 'Fase Interna'),
  ('tender-sem-nr-bsup-hortifruti-2026',  'A definir', 'Aquisição de QR - Hortifruti - 2ª Licitação', 'pending', 'Fase Interna'),
  ('tender-sem-nr-bsup-enlatados-2026',   'A definir', 'Aquisição de QR - Enalatados e Embutidos - 2ª Licitação', 'pending', 'Fase Interna'),
  ('tender-sem-nr-bsup-camaras-sv',       'A definir', 'Sv Mnt Prev e Corr Câmaras Frigoríficas', 'pending', 'Fase Interna'),
  ('tender-sem-nr-bsup-chamada-pub',      'A definir', 'Aquisição de QR - Chamada Pública', 'pending', 'Fase Interna'),
  ('tender-sem-nr-coleta-seletiva',       'A definir', 'Chamada pública da Coleta Seletiva', 'pending', 'Fase Interna')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = NOW();

-- -------------------------------------------------------
-- BLOCO 3: Registros sem Nr (PCA 2026 - Anexos A, B e C)
-- -------------------------------------------------------

INSERT INTO tenders (id, number, description, status, current_stage)
VALUES
  -- PCA Anexo A - 9 GPT
  ('tender-pca-a-qs-bsup-2026',           'A definir', 'Aquisição de QS', 'pending', 'Planejamento'),
  ('tender-pca-a-consumo-pasa-2026',      'A definir', 'Aquisição de material de consumo - PASA', 'pending', 'Planejamento'),
  ('tender-pca-a-sv-pasa-2026',           'A definir', 'Contratação de serviços - PASA', 'pending', 'Planejamento'),
  ('tender-pca-a-perm-pasa-2026',         'A definir', 'Aquisição de material permanente - PASA', 'pending', 'Planejamento'),
  ('tender-pca-a-racao-2026',             'A definir', 'Aquisição de ração canina (1) e equina (2), alfafa, aveia e feno', 'pending', 'Planejamento'),
  ('tender-pca-a-audatex-2026',           'A definir', 'Aquisição de peças de Vtr - AUDATEX', 'pending', 'Planejamento'),
  ('tender-pca-a-enlatados-enum-2026',    'A definir', 'Aquisição de QR Enlatados e Embutidos', 'pending', 'Planejamento'),

  -- PCA Anexo B - 9 BSUP
  ('tender-pca-b-colchoes-2026',          'A definir', 'Aquisição de colchões, armários, beliches, cama, mesa e banho.', 'pending', 'Planejamento'),
  ('tender-pca-b-eletrico-bsup-2026',     'A definir', 'Aquisição de Material Elétrico', 'pending', 'Planejamento'),
  ('tender-pca-b-uniformes-2026',         'A definir', 'Uniformes especiais e históricos, bandeiras e insígnias', 'pending', 'Planejamento'),
  ('tender-pca-b-camaras-sv-2026',        'A definir', 'Contratação de serviços de manutenção preventiva e corretiva de câmaras frigoríficas', 'pending', 'Planejamento'),
  ('tender-pca-b-chamada-qs-2026',        'A definir', 'Aquisição de QR - Chamada pública', 'pending', 'Planejamento'),
  ('tender-pca-b-gorro-selva-2026',       'A definir', 'Aquisição de gorro de selva', 'pending', 'Planejamento'),

  -- PCA Anexo C
  ('tender-pca-c-pcs-eng-emb-2026',       'A definir', 'Aquisição de peças para manutenção de material de engenharia - Embarcações, motores de popa e geradores (Classe VI)', 'pending', 'Planejamento'),
  ('tender-pca-c-sv-mnt-bld-b-2026',      'A definir', 'Contratação de serviços de manutenção de Vtr Bld - Serviços não continuados (Classe IX)', 'pending', 'Planejamento'),
  ('tender-pca-c-geradores-hcmp-2026',    'A definir', 'Aquisição de geradores e equipamentos de ar condicionados - H Cmp', 'pending', 'Planejamento'),
  ('tender-pca-c-baterias-oleos-2026',    'A definir', 'Aquisição de insumos Classe IX - Baterias, óleos, filtros e graxas', 'pending', 'Planejamento'),
  ('tender-pca-c-audatex-sv-2026',        'A definir', 'Contratação de serviços Mnt de Vtr - AUDATEX (Classe IX)', 'pending', 'Planejamento'),
  ('tender-pca-c-agua-artesiana-2026',    'A definir', 'Contratação de serviços de análise e tratamento de água - poços artesianos do Forte Logístico - 5 meses (Dispensa de Licitação)', 'pending', 'Planejamento'),
  ('tender-pca-c-residuo-hosp-2026',      'A definir', 'Contratação de serviço de coleta de resíduo hospitalar (Dispensa de licitação)', 'pending', 'Planejamento'),
  ('tender-pca-c-ferramental-2026',       'A definir', 'Aquisição de ferramental para oficinas e máquina de costura para correaria', 'pending', 'Planejamento'),
  ('tender-pca-c-qs-chamada-2026',        'A definir', 'Aquisição de QS - Chamada Pública', 'pending', 'Planejamento'),
  ('tender-pca-c-pcs-bld-c-2026',        'A definir', 'Aquisição de peças para manutenção de viaturas blindadas (Classe IX)', 'pending', 'Planejamento'),
  ('tender-pca-c-cabine-pintura-2026',    'A definir', 'Aquisição de cabine de pintura para a Seção de Lanternagem e Pintura', 'pending', 'Planejamento'),
  ('tender-pca-c-ponte-rolante-2026',     'A definir', 'Serviço de instalação de ponte rolante com capacidade de 20 Ton para adequação do Pel Mnt Vtr Bld', 'pending', 'Planejamento'),
  ('tender-pca-c-pneus-2026',             'A definir', 'Aquisição de insumos Classe IX - Pneus', 'pending', 'Planejamento'),
  ('tender-pca-c-leilao-vi-2026',         'A definir', 'Alienação de bens móveis – Leilão (Classe VI)', 'pending', 'Planejamento'),
  ('tender-pca-c-leilao-ix-2026',         'A definir', 'Alienação de bens móveis – Leilão (Classe IX)', 'pending', 'Planejamento'),
  ('tender-pca-c-insumos-of-2026',        'A definir', 'Aquisição de insumos para oficinas (armamento, correaria, carpintaria, tornearia e lanternagem e pintura)', 'pending', 'Planejamento'),
  ('tender-pca-c-sv-eng-emb-2026',        'A definir', 'Contratação de serviços para manutenção de material de engenharia - Embarcações, motores de popa e geradores (Classe VI)', 'pending', 'Planejamento'),
  ('tender-pca-c-pcs-eng-2-2026',         'A definir', 'Aquisição de peças para manutenção de material de engenharia - Embarcações, motores de popa e geradores (Classe VI)', 'pending', 'Planejamento'),
  ('tender-pca-c-sv-bld-dup-2026',        'A definir', 'Contratação de serviços de manutenção de Vtr Bld - Serviços não continuados (Classe IX) [duplicado PCA]', 'pending', 'Planejamento'),
  ('tender-pca-c-leiloeiro-2026',         'A definir', 'Contratação de Leiloeiro', 'pending', 'Planejamento'),
  ('tender-pca-c-imovel-financ-2026',     'A definir', 'Cessão de uso de imóvel para funcionamento de Serviços Financeiros', 'pending', 'Planejamento'),
  ('tender-pca-c-imovel-cantina-2026',    'A definir', 'Cessão de uso de imóvel para funcionamento de Cantina', 'pending', 'Planejamento'),
  ('tender-pca-c-internet-btrnp-2026',    'A definir', 'Serviço de Internet dados móveis', 'pending', 'Planejamento'),
  ('tender-pca-c-esgoto-btrnp-2026',      'A definir', 'Contratação de serviço para reforma/substituição da rede interna de esgoto do 18º B Trnp', 'pending', 'Planejamento'),
  ('tender-pca-c-reparacao-cia-2026',     'A definir', 'Solicitação: Reparação / Alvenaria / Reserva de Material 18º B Trnp (DISPENSA ELETRÔNICA)', 'pending', 'Planejamento')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = NOW();

-- -------------------------------------------------------
-- BLOCO 4: Operação Perseu (sem Nr Pregão)
-- -------------------------------------------------------

INSERT INTO tenders (id, number, description, status, current_stage)
VALUES
  ('tender-perseu-peças-pall-1',   'A definir', 'Aquisição de peças para PALL (Operação Perseu) - 1', 'pending', 'Planejamento'),
  ('tender-perseu-peças-pall-2',   'A definir', 'Aquisição de peças para PALL (Operação Perseu) - 2', 'pending', 'Planejamento'),
  ('tender-perseu-sv-pall',        'A definir', 'Aquisição de Serviço para manutenção de PALL (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-pneus',          'A definir', 'Aquisição de Pneus para viaturas blindadas e não-blindadas (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-olg',            'A definir', 'OLG (óleos, graxas, lubrificantes e ARLA) e afins para viaturas Bld, não Blindadas, Armamento, Motocicletas e Material de Engenharia (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-baterias',       'A definir', 'Baterias para Vtr Bld, não Blindada, Motocicleta, embarcações, geradores e Equipamento de Engenharia (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-tintas',         'A definir', 'Tintas e afins para Vtr blindadas, não blindadas, armamentos, embarcações, geradores e Equipamento de Eng (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-sv-vtr-nbld',    'A definir', 'Serviços de viaturas não blindada e motocicleta das seguintes marcas: Honda, Yamaha, MBB, Volkswagen, Agrale, Toyota, Nissan, Mitsubishi, Renault, Iveco, Scania, Volvo, DAF (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-pcs-vtr-nbld',   'A definir', 'Peças de viaturas não blindada e motocicleta das seguintes marcas: Honda, Yamaha, MBB, Volkswagen, Agrale, Toyota, Nissan, Mitsubishi, Renault, Iveco, Scania, Volvo, DAF (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-pcs-bld',        'A definir', 'Peças de viaturas blindadas: Cascavel; Guarani; M60 A3TTS e M113BR (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-sv-bld',         'A definir', 'Serviços de viatura blindadas: Cascavel; Guarani; M60 A3TTS e M113BR (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-prancha-gran',   'A definir', 'Peças e Serviço de manutenção em VSRE Prancha e VSRNE Graneleiro (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-frig',           'A definir', 'Peças e Serviço de manutenção em VTE Frigorífico, VSRE Frigorífico, Container Frigorífico (Operação Perseu)', 'pending', 'Planejamento'),
  ('tender-perseu-aluguel-vte',    'A definir', 'Aluguel de VTE para salvamento e evacuação: VSRE Pranchas e VTTNE Cavalo Mecânico, VTE Socorro Leve e Pesado (Operação Perseu)', 'pending', 'Planejamento')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = NOW();

-- -------------------------------------------------------
-- Registros extras identificados nos chunks
-- -------------------------------------------------------

INSERT INTO tenders (id, number, description, status, current_stage)
VALUES
  -- NUP: 65345.000650/2025-66 (sem nr pregão - "pregão de dois mil itens")
  ('tender-nup-000650-2025',   'A definir', 'Aqs de Pçs Mnt de Vtr Bld (Classe IX) NUP 65345.000650/2025-66', 'pending', 'Fase Interna'),
  -- NUP: 65345.003175/2025-80 (sem nr pregão)
  ('tender-nup-003175-2025',   'A definir', 'Sv Mnt Vtr Bld (Classe IX) NUP 65345.003175/2025-80', 'pending', 'Fase Interna'),
  -- NUP: 65345.005019/2025-53 - insumos e pç para Mnt Mat Eng
  ('tender-nup-insumos-eng',   'A definir', 'Aqs de insumos e pç para Mnt Mat Eng', 'pending', 'Fase Interna'),
  -- INEX: Inexigibilidade TUSD
  ('tender-inex-tusd-2025',    'A definir', 'Inexigibilidade TUSD (Energia Elétrica) NUP 65297.014405/2025-59', 'pending', 'Fase Externa')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at  = NOW();

COMMIT;

-- Verificação: contar registros inseridos/atualizados
SELECT COUNT(*) AS total_tenders FROM tenders;
