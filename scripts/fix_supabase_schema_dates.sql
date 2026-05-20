-- ADICIONA COLUNA DE CHECKS DE DATAS NA TABELA TENDERS
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS date_checks JSONB DEFAULT '{}'::jsonb;

-- GARANTE QUE A COLUNA DATES TAMBÉM SEJA JSONB (CASO NÃO SEJA)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenders' AND column_name='dates') THEN
        ALTER TABLE tenders ADD COLUMN dates JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
