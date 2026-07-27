import { useState, useEffect } from 'react';
import { Anamnesis } from '../types';
import { Check, Save, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AnamnesisFormProps {
  patientId: string;
}

export default function AnamnesisForm({ patientId }: AnamnesisFormProps) {
  const [history, setHistory] = useState<Anamnesis[]>([]);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);

  useEffect(() => {
    fetchAnamnesis();
  }, [patientId]);

  const fetchAnamnesis = async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/anamnesis`);
      const data = await res.json();
      setHistory(data);
      if (data.length > 0) {
        // Load the most recent one by default if it's the first load
        setFormData(JSON.parse(data[0].content));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`/api/patients/${patientId}/anamnesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: JSON.stringify(formData) })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchAnamnesis();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const YesNoInput = ({ label, field, subLabel, options = ['Não', 'Sim'] }: any) => {
    const isYes = formData[field] === 'Sim';
    return (
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <label className="text-sm font-medium text-gray-700 flex-1">{label}</label>
          <div className="flex items-center space-x-4 shrink-0">
            {options.map((opt: string) => (
              <label key={opt} className="flex items-center space-x-1 cursor-pointer">
                <input 
                  type="radio" 
                  name={field} 
                  value={opt} 
                  checked={formData[field] === opt} 
                  onChange={() => handleChange(field, opt)} 
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4" 
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
        {isYes && subLabel && (
          <div className="mt-2 sm:pl-2 sm:border-l-2 sm:border-blue-100">
             <input 
               type="text" 
               placeholder={subLabel} 
               className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50 focus:bg-white transition-colors" 
               value={formData[`${field}_details`] || ''} 
               onChange={e => handleChange(`${field}_details`, e.target.value)} 
             />
          </div>
        )}
      </div>
    );
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-6 mt-8">{title}</h3>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Ficha de Anamnese</h3>
        <button 
          onClick={() => setViewHistory(!viewHistory)}
          className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          <History className="w-4 h-4" />
          <span>{viewHistory ? 'Voltar para Ficha' : 'Ver Histórico'}</span>
        </button>
      </div>

      {viewHistory ? (
        <div className="space-y-4">
          {history.length === 0 ? (
             <p className="text-gray-500 text-sm">Nenhum histórico encontrado.</p>
          ) : (
            history.map((h, i) => (
              <div key={h.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">Atualização {history.length - i}</p>
                  <p className="text-sm text-gray-500">{format(parseISO(h.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
                <button 
                  onClick={() => {
                    setFormData(JSON.parse(h.content));
                    setViewHistory(false);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Carregar Dados
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white">
          <SectionTitle title="Histórico de Saúde e Hábitos" />
          
          <YesNoInput label="Pratica atividade física regularmente?" field="atividade_fisica" subLabel="Se sim, qual(is) e com qual frequência?" />
          
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-sm font-medium text-gray-700">Como avalia seus hábitos alimentares?</label>
            <div className="flex flex-wrap gap-4 shrink-0">
               {['Ótimos', 'Bons', 'Regulares', 'Ruins'].map(opt => (
                 <label key={opt} className="flex items-center space-x-1 cursor-pointer">
                   <input type="radio" name="habitos_alimentares" value={opt} checked={formData.habitos_alimentares === opt} onChange={() => handleChange('habitos_alimentares', opt)} className="text-blue-600 w-4 h-4" />
                   <span className="text-sm text-gray-700">{opt}</span>
                 </label>
               ))}
            </div>
          </div>

          <YesNoInput label="Houve perda ou ganho de peso significativo recentemente (mais de 5kg nos últimos 3 meses)?" field="peso_alteracao" subLabel="Se sim, quantos quilos e qual o motivo aparente?" />
          <YesNoInput label="Faz uso frequente de bebidas alcoólicas?" field="alcool" subLabel="Se sim, qual frequência e quantidade?" />
          <YesNoInput label="É fumante ou ex-fumante?" field="fumo" subLabel="Se sim, qual é a frequência/há quanto tempo parou?" />
          <YesNoInput label="Faz uso de drogas ilícitas?" field="drogas" />
          <YesNoInput label="Passou por algum trauma emocional importante recente?" field="trauma_emocional" subLabel="Se sim, qual o motivo aparente?" />
          
          <SectionTitle title="Histórico Médico e Reposições" />
          
          <YesNoInput label="Está gestante ou amamentando?" field="gestante" />
          <YesNoInput label="Seu ciclo menstrual é regular?" field="ciclo_menstrual" options={['Não', 'Sim', 'Não se aplica']} />
          <YesNoInput label="Utiliza método contraceptivo?" field="contraceptivo" />
          <YesNoInput label="Faz ou já fez reposição hormonal?" field="reposicao_hormonal" />
          <YesNoInput label="Está sob tratamento médico atualmente?" field="tratamento_medico" subLabel="Se sim, para qual condição?" />
          <YesNoInput label="Utiliza alguma medicação de uso contínuo ou controlado?" field="medicacao_continua" subLabel="Se sim, qual(is) e quando?" />
          <YesNoInput label="Utiliza ou já utilizou anabolizantes?" field="anabolizantes" subLabel="Se sim, qual(is) e quando?" />
          <YesNoInput label="Possui alergia a medicamentos, anestésicos, cosméticos ou alimentos?" field="alergias" subLabel="Se sim, especifique:" />

          <SectionTitle title="Histórico Estético e Cuidados com a Pele" />

          <YesNoInput label="Realizou tratamento estético anteriormente?" field="tratamento_estetico" subLabel="Se sim, qual(is) e quando?" />
          <YesNoInput label="Realizou cirurgia ou procedimento de harmonização facial anteriormente?" field="cirurgia_facial" subLabel="Se sim, qual(is) e quando?" />
          <YesNoInput label="Possui rotina de cuidados com a pele do rosto?" field="cuidados_rosto" subLabel="Se sim, descreva brevemente:" />
          <YesNoInput label="Utiliza ou já utilizou ácidos na pele?" field="acidos_pele" subLabel="Se sim, qual(is) e quando?" />
          <YesNoInput label="Utiliza ou utilizou Roacutan (Isotretinoína)?" field="roacutan" subLabel="Se sim, quando terminou o tratamento?" />
          
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-sm font-medium text-gray-700">Como descreve sua exposição solar diária/frequente?</label>
            <div className="flex flex-wrap gap-4 shrink-0">
               {['Baixa', 'Moderada', 'Alta'].map(opt => (
                 <label key={opt} className="flex items-center space-x-1 cursor-pointer">
                   <input type="radio" name="exposicao_solar" value={opt} checked={formData.exposicao_solar === opt} onChange={() => handleChange('exposicao_solar', opt)} className="text-blue-600 w-4 h-4" />
                   <span className="text-sm text-gray-700">{opt}</span>
                 </label>
               ))}
            </div>
          </div>
          
          <YesNoInput label="Utiliza protetor solar regularmente?" field="protetor_solar" />
          <YesNoInput label="Possui alguma doença de pele diagnosticada (ex: acne, rosácea, dermatite)?" field="doenca_pele" subLabel="Se sim, qual(is)?" />
          <YesNoInput label="Tem histórico familiar de acne relevante?" field="historico_acne" />
          <YesNoInput label="Tem predisposição à formação de queloides?" field="queloides" />
          <YesNoInput label="Possui manchas na pele?" field="manchas_pele" subLabel="Se sim, onde e há quanto tempo?" />
          <YesNoInput label="Observa alguma alteração vascular na pele?" field="alteracao_vascular" subLabel="Se sim, descreva:" />
          <YesNoInput label="Percebe o surgimento de hematomas com facilidade?" field="hematomas" />
          <YesNoInput label="Possui varizes ou microvarizes?" field="varizes" />
          <YesNoInput label="Tem histórico de hemorragia ou dificuldade de cicatrização?" field="cicatrizacao" />
          <YesNoInput label="Apresenta alguma formação sólida na pele (nódulos, verrugas, cistos, cicatrizes)?" field="formacao_solida" subLabel="Se sim, descreva:" />
          <YesNoInput label="Sofreu algum trauma ou fratura na face?" field="trauma_face" subLabel="Se sim, quando e qual foi o tratamento?" />

          <SectionTitle title="Doenças e Implantes" />
          
          <YesNoInput label="Possui alguma prótese metálica ou implante no corpo/face?" field="implante" subLabel="Se sim, onde?" />
          <YesNoInput label="Possui alguma doença cardiovascular (ex: arritmia, pressão alta)?" field="cardiovascular" subLabel="Se sim, qual(is)?" />
          <YesNoInput label="Tem ou teve distúrbios respiratórios significativos (ex: asma grave, bronquite crônica)?" field="respiratorio" subLabel="Se sim, qual(is)?" />
          <YesNoInput label="Já teve desmaios, tonturas frequentes ou convulsões?" field="desmaios" subLabel="Se sim, relate brevemente:" />
          <YesNoInput label="Possui alguma doença crônica (ex: diabetes, hipertensão, doença renal, hepática, autoimune)?" field="cronica" subLabel="Se sim, qual(is) e faz acompanhamento?" />
          <YesNoInput label="Foi diagnosticado com alguma doença infectocontagiosa (ex: hepatite, HIV)?" field="infectocontagiosa" subLabel="Se sim, qual?" />

          <SectionTitle title="Expectativas" />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Em uma escala de 0 (muito insatisfeito) a 5 (muito satisfeito), qual seu nível de satisfação com sua aparência facial/corporal atualmente?</label>
            <div className="flex gap-4">
              {[0, 1, 2, 3, 4, 5].map(opt => (
                <label key={opt} className="flex flex-col items-center space-y-1 cursor-pointer">
                  <span className="text-sm font-medium text-gray-600">{opt}</span>
                  <input type="radio" name="satisfacao" value={opt} checked={Number(formData.satisfacao) === opt} onChange={() => handleChange('satisfacao', opt)} className="text-blue-600 w-4 h-4" />
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4 mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Qual sua principal expectativa em relação ao tratamento estético que busca?</label>
            <textarea 
              rows={2}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm bg-gray-50 focus:bg-white transition-colors"
              value={formData.expectativa || ''}
              onChange={e => handleChange('expectativa', e.target.value)}
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Existe algo mais que considera importante informar sobre sua saúde ou hábitos antes de um procedimento estético?</label>
            <textarea 
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm bg-gray-50 focus:bg-white transition-colors"
              value={formData.algo_mais || ''}
              onChange={e => handleChange('algo_mais', e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm shadow-blue-200"
            >
              {loading ? (
                 <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              ) : success ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Salvo com sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salvar Anamnese</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
