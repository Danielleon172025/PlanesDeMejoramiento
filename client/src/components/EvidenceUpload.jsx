import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { uploadFile } from '../services/api';

const EvidenceUpload = ({ onUploadComplete, label = "Adjuntar Evidencia" }) => {
    const [uploading, setUploading] = useState(false);
    const [fileUrl, setFileUrl] = useState(null); // URL returned from server or local preview
    const [fileName, setFileName] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño (ej. 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('El archivo excede el tamaño máximo de 10MB');
            return;
        }

        setUploading(true);
        setError(null);
        setFileName(file.name);

        try {
            const response = await uploadFile(file);
            // Response format from backend: { message, filename, originalName, mimetype, url }
            setFileUrl(response.url);
            if (onUploadComplete) {
                onUploadComplete(response.url, response.filename); // Pass URL and filename
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('Error al subir el archivo. Intente nuevamente.');
            setFileName(null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setFileUrl(null);
        setFileName(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onUploadComplete) {
            onUploadComplete(null, null);
        }
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2 font-montserrat">
                {label}
            </label>

            {!fileUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    onClick={() => fileInputRef.current?.click()}>
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-csj-azul">
                            <Loader size={24} className="animate-spin" />
                            <span className="text-sm font-medium">Subiendo archivo...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                            <Upload size={24} />
                            <span className="text-sm font-medium">Click para seleccionar archivo</span>
                            <span className="text-xs text-gray-400">(Max 10MB - PDF, IMG, ZIP)</span>
                        </div>
                    )}

                    {error && (
                        <div className="mt-3 flex items-center justify-center gap-2 text-red-500 text-xs">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-white p-2 rounded-full border border-green-100">
                            <FileText size={20} className="text-csj-verde" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-700 truncate">{fileName}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle size={10} /> Subido exitosamente
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRemove}
                        className="p-1 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar archivo"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EvidenceUpload;
