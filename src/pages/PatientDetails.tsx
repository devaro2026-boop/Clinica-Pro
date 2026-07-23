import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Patient, Photo, ConsentForm, Package } from '../types';
import { User, Image as ImageIcon, FileText, PenTool, CreditCard, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientDetails() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('prontuario');
  
  // Tab States
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [forms, setForms] = useState<ConsentForm[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  
  // Refs for signature and PDF
  const sigCanvas = useRef<SignatureCanvas>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const pRes = await fetch(`/api/patients/${id}`);
      setPatient(await pRes.json());
      
      const photoRes = await fetch(`/api/patients/${id}/photos`);
      setPhotos(await photoRes.json());

      const formRes = await fetch(`/api/patients/${id}/consent-forms`);
      setForms(await formRes.json());

      const pkgRes = await fetch(`/api/patients/${id}/packages`);
      setPackages(await pkgRes.json());
    } catch (e) { console.error(e); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('photo', e.target.files[0]);
    formData.append('patient_id', id!);
    formData.append('type', type);
    formData.append('date', new Date().toISOString());

    await fetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
    });
    fetchPatientData();
  };

  const saveConsentForm = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert("Por favor, assine o termo.");
      return;
    }
    const signatureBase64 = sigCanvas.current.toDataURL();
    
    // Generate PDF
    if (pdfRef.current) {
        const canvas = await html2canvas(pdfRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Em um app real, faríamos upload do PDF, mas aqui vamos salvar os dados
        const pdfBlob = pdf.output('blob');
        const formData = new FormData();
        formData.append('pdf', pdfBlob, 'termo.pdf');
        formData.append('patient_id', id!);
        formData.append('title', 'Termo de Consentimento Padrão');
        formData.append('signature_base64', signatureBase64);

        await fetch('/api/consent-forms/upload-pdf', {
            method: 'POST',
            body: formData
        });
        
        sigCanvas.current.clear();
        fetchPatientData();
        alert("Termo salvo com sucesso e PDF gerado.");
    }
  };

  if (!patient) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/patients" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 w-fit">
        <ChevronLeft className="w-5 h-5 mr-1" />
        Voltar para pacientes
      </Link>
      
      <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center space-x-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
          <User className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{patient.name}</h2>
          <div className="flex space-x-4 mt-2 text-gray-500 text-sm">
            <span>{patient.phone}</span>
            <span>•</span>
            <span>{patient.email}</span>
            <span>•</span>
            <span>CPF: {patient.cpf}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 mb-8 overflow-x-auto">
        {[
          { id: 'prontuario', icon: FileText, label: 'Anamnese' },
          { id: 'fotos', icon: ImageIcon, label: 'Galeria (Antes/Depois)' },
          { id: 'assinatura', icon: PenTool, label: 'Termos e Assinatura' },
          { id: 'pacotes', icon: CreditCard, label: 'Pacotes e Sessões' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
        {activeTab === 'fotos' && (
          <div>
            <h3 className="text-xl font-bold mb-6">Comparação Antes e Depois</h3>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
                <h4 className="font-semibold text-gray-700 mb-4">Foto Antes</h4>
                <input type="file" onChange={e => handlePhotoUpload(e, 'before')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center">
                <h4 className="font-semibold text-gray-700 mb-4">Foto Depois</h4>
                <input type="file" onChange={e => handlePhotoUpload(e, 'after')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                  <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Histórico "Antes"</h4>
                  {photos.filter(p => p.type === 'before').map(p => (
                      <img key={p.id} src={p.url} className="w-full rounded-xl object-cover aspect-square shadow-sm" alt="Antes" />
                  ))}
               </div>
               <div className="space-y-4">
                  <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Histórico "Depois"</h4>
                  {photos.filter(p => p.type === 'after').map(p => (
                      <img key={p.id} src={p.url} className="w-full rounded-xl object-cover aspect-square shadow-sm" alt="Depois" />
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'assinatura' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div ref={pdfRef} className="p-8 border border-gray-200 rounded-xl bg-gray-50 text-gray-800">
              <h3 className="text-2xl font-bold mb-4 text-center">Termo de Consentimento Livre e Esclarecido</h3>
              <p className="mb-4 text-sm leading-relaxed">
                Eu, <strong>{patient.name}</strong>, portador(a) do CPF <strong>{patient.cpf}</strong>, autorizo a clínica a realizar os procedimentos estéticos propostos.
                Declaro que fui informado(a) sobre os benefícios, riscos, e alternativas aos tratamentos.
              </p>
              <p className="mb-4 text-sm leading-relaxed">
                Autorizo também o registro fotográfico (Antes/Depois) exclusivamente para acompanhamento de evolução clínica.
              </p>
              <div className="mt-12 text-center text-sm">
                 <div className="w-64 border-b border-gray-400 mx-auto mb-2"></div>
                 <p>Assinatura do Paciente</p>
                 <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex flex-col">
              <h3 className="text-xl font-bold mb-4">Assinatura Digital (Tela)</h3>
              <div className="border-2 border-gray-300 rounded-xl bg-white overflow-hidden mb-4">
                <SignatureCanvas 
                  ref={sigCanvas} 
                  canvasProps={{className: 'w-full h-64'}} 
                />
              </div>
              <div className="flex space-x-4">
                <button onClick={() => sigCanvas.current?.clear()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
                  Limpar
                </button>
                <button onClick={saveConsentForm} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors">
                  Salvar Termo e Gerar PDF
                </button>
              </div>
              
              <div className="mt-8">
                <h4 className="font-semibold text-gray-700 mb-4">Termos Salvos</h4>
                <ul className="space-y-2">
                  {forms.map(f => (
                    <li key={f.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                      <span>{f.title}</span>
                      <a href={f.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ver PDF</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pacotes' && (
           <div>
             <h3 className="text-xl font-bold mb-6">Controle de Pacotes</h3>
             {/* Add Package logic here if needed for MVP, keeping it simple */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {packages.map(pkg => (
                 <div key={pkg.id} className="p-6 border border-gray-200 rounded-2xl">
                    <h4 className="font-bold text-lg">{pkg.name}</h4>
                    <div className="mt-4 flex items-end justify-between">
                       <div>
                         <p className="text-sm text-gray-500 mb-1">Sessões Realizadas</p>
                         <p className="text-2xl font-semibold">{pkg.used_sessions} / {pkg.total_sessions}</p>
                       </div>
                       <button 
                          onClick={() => {
                            fetch(`/api/packages/${pkg.id}/use`, { method: 'PUT' }).then(fetchPatientData);
                          }}
                          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100"
                          disabled={pkg.used_sessions >= pkg.total_sessions}
                       >
                          Baixa
                       </button>
                    </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        {activeTab === 'prontuario' && (
          <div>
            <h3 className="text-xl font-bold mb-6">Ficha de Anamnese</h3>
            <textarea 
              className="w-full h-64 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Digite o histórico clínico, alergias, tratamentos prévios..."
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Salvar Anamnese
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
