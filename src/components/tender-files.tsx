"use client"

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, UploadCloud, Download, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { useUser } from '@/contexts/user-context';

interface TenderFile {
    id: string;
    tender_id: string;
    file_name: string;
    file_size: number;
    file_url: string;
    uploaded_by: string;
    uploaded_at: string;
}

export function TenderFiles({ tenderId }: { tenderId: string }) {
    const { role, user } = useUser();
    const isMajor = user?.email?.toLowerCase().trim() === 'edersouzamelo@gmail.com';
    const canManageFiles = role === 'Chefe da Seção de Licitações' || role === 'Administrador' || role === 'Pregoeiro' || isMajor;

    const [files, setFiles] = useState<TenderFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }
        fetchFiles();
    }, [tenderId]);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tender_files')
                .select('*')
                .eq('tender_id', tenderId)
                .order('uploaded_at', { ascending: false });

            if (!error && data) {
                setFiles(data);
            } else if (error) {
                console.error("Error fetching files:", error.message);
            }
        } catch (e) {
            console.error("Unknown error fetching files:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setIsUploading(true);
        try {
            // Get user or just use a placeholder if auth is not fully configured for this context
            const { data: userData } = await supabase.auth.getUser();
            const uploadedBy = userData?.user?.email || 'Usuário RADAR';

            // Convert FileList to Array
            const filesArray = Array.from(selectedFiles);

            // Process all files concurrently
            await Promise.all(filesArray.map(async (file) => {
                // Upload to Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${tenderId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('tender_documents')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('tender_documents')
                    .getPublicUrl(filePath);

                // Save to DB
                const { data: insertedData, error: dbError } = await supabase
                    .from('tender_files')
                    .insert([{
                        tender_id: tenderId,
                        file_name: file.name,
                        file_size: file.size,
                        file_url: publicUrl,
                        uploaded_by: uploadedBy
                    }])
                    .select();

                if (dbError) throw dbError;

                // Trigger RAG Processing text extraction (fire and forget immediately)
                if (insertedData && insertedData[0]) {
                    try {
                        fetch('/api/rag/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fileUrl: publicUrl,
                                tenderId: tenderId,
                                fileId: insertedData[0].id,
                                fileName: file.name
                            })
                        }).catch(err => console.error("Falha background RAG", err));
                    } catch (ragError) {
                        console.error("Erro interno no RAG endpoint:", ragError);
                    }
                }
            }));

            // Refresh list
            fetchFiles();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Erro ao enviar o arquivo. Verifique se a tabela e o bucket foram criados no Supabase.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!confirm('Deseja realmente excluir este arquivo?')) return;

        try {
            // Extract path from public URL
            const urlParts = fileUrl.split('/');
            const filePath = urlParts[urlParts.length - 1];

            if (filePath) {
                await supabase.storage.from('tender_documents').remove([filePath]);
            }

            const { error } = await supabase
                .from('tender_files')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Erro ao excluir o arquivo.');
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!supabase) return null;

    return (
        <Card className="mb-6 border-radar-gold/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-radar-gold"></div>
            <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UploadCloud className="h-5 w-5 text-radar-gold" />
                        Minutas e Documentos
                    </CardTitle>
                    <div>
                        {canManageFiles ? (
                            <>
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="bg-radar-gold text-radar-dark hover:bg-radar-gold/80 font-semibold"
                                >
                                    {isUploading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lendo para IA...</>
                                    ) : (
                                        <><UploadCloud className="mr-2 h-4 w-4" /> Enviar Arquivo</>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <span className="text-[10px] text-muted-foreground flex items-center font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                                <ShieldAlert className="w-3 h-3 text-amber-500 mr-1" /> Somente Gestores enviam arquivos.
                            </span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium text-foreground">Ainda não há documentos anexados.</p>
                        <p className="text-xs text-muted-foreground mt-1">Faça o upload de Editais, Termos de Referência (TR) e minutas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="flex flex-col p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-radar-gold/50 transition-all hover:shadow-md relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-radar-gold group-hover:scale-110 transition-transform">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <div className="flex gap-1 z-10">
                                        {canManageFiles && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(file.id, file.file_url)} title="Excluir">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-radar-gold hover:bg-radar-gold/10 rounded-full" title="Baixar">
                                                <Download className="h-3.5 w-3.5" />
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold truncate text-foreground mb-1 group-hover:text-radar-gold transition-colors" title={file.file_name}>
                                        {file.file_name}
                                    </p>
                                    <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground font-medium">
                                        <span>{formatBytes(file.file_size)}</span>
                                        <span>{new Date(file.uploaded_at).toLocaleDateString('pt-BR')} às {new Date(file.uploaded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[9px] text-muted-foreground truncate uppercase tracking-wider">
                                    Enviado por: {file.uploaded_by.split('@')[0]}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
