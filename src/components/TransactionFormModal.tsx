import { useState, useEffect } from 'react';
import { Patient, Wallet } from '../types';
import { X, Calendar, DollarSign, UserCheck, Tag, Sliders, Percent, ArrowRight, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, saveAndNew: boolean) => void;
  editingRecord?: any;
  patients: Patient[];
  wallets: Wallet[];
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  patients,
  wallets
}: TransactionFormModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [competencyDate, setCompetencyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [patientId, setPatientId] = useState('');
  const [supplierText, setSupplierText] = useState('');
  const [responsible, setResponsible] = useState('MIRIA ROCHELLE APRIGIO DOS SANTOS');
  const [category, setCategory] = useState('Outros');
  const [costCenter, setCostCenter] = useState('Geral');
  
  // Apportionment states (Rateio)
  const [enableApportionment, setEnableApportionment] = useState(false);
  const [apportionments, setApportionments] = useState<Array<{ costCenter: string; percentage: number }>>([
    { costCenter: 'Geral', percentage: 100 }
  ]);

  // Payment Condition states
  const [accountCard, setAccountCard] = useState('');
  const [installments, setInstallments] = useState('À vista');
  const [isCompleted, setIsCompleted] = useState(false); // Paid / Received

  // Accordion for More Options
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const categories = [
    'Serviços', 'Produtos', 'Aluguel', 'Fornecedores', 'Salários', 'Marketing', 'Impostos', 'Outros'
  ];

  const costCenters = [
    'Geral', 'Estética', 'Salão', 'Clínica', 'Marketing', 'Administrativo', 'Outros'
  ];

  const installmentOptions = [
    'À vista', '2x', '3x', '4x', '5x', '6x', '8x', '10x', '12x'
  ];

  const responsiblesList = [
    'MIRIA ROCHELLE APRIGIO DOS SANTOS',
    'DRA. BEATRIZ SOUZA',
    'THIAGO SILVA (FINANCEIRO)',
    'OUTRO OPERADOR'
  ];

  // Set default values when editing or opening
  useEffect(() => {
    if (editingRecord) {
      setType(editingRecord.type);
      setDescription(editingRecord.description);
      setCompetencyDate(editingRecord.competency_date || editingRecord.date);
      setDueDate(editingRecord.due_date || editingRecord.date);
      setAmount(String(editingRecord.amount));
      if (editingRecord.type === 'income') {
        setPatientId(editingRecord.patient_id ? String(editingRecord.patient_id) : '');
      } else {
        setSupplierText(editingRecord.patient_name || '');
      }
      setResponsible(editingRecord.responsible || 'MIRIA ROCHELLE APRIGIO DOS SANTOS');
      setCategory(editingRecord.category || 'Outros');
      setCostCenter(editingRecord.cost_center || 'Geral');
      setAccountCard(editingRecord.account_card || '');
      setInstallments(editingRecord.installments || 'À vista');
      setIsCompleted(editingRecord.status === 'paid');
      
      if (editingRecord.apportionment) {
        try {
          const parsed = JSON.parse(editingRecord.apportionment);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setApportionments(parsed);
            setEnableApportionment(true);
          }
        } catch (e) {
          setEnableApportionment(false);
        }
      } else {
        setEnableApportionment(false);
      }
    } else {
      // Defaults
      setType('expense');
      setDescription('');
      setCompetencyDate(format(new Date(), 'yyyy-MM-dd'));
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
      setPatientId('');
      setSupplierText('');
      setResponsible('MIRIA ROCHELLE APRIGIO DOS SANTOS');
      setCategory('Outros');
      setCostCenter('Geral');
      setEnableApportionment(false);
      setApportionments([{ costCenter: 'Geral', percentage: 100 }]);
      setAccountCard(wallets[0]?.name || '');
      setInstallments('À vista');
      setIsCompleted(false);
      setShowMoreOptions(false);
      setNotes('');
    }
    setValidationError('');
  }, [editingRecord, isOpen, wallets]);

  if (!isOpen) return null;

  const handleAddApportionment = () => {
    setApportionments([...apportionments, { costCenter: 'Outros', percentage: 0 }]);
  };

  const handleRemoveApportionment = (index: number) => {
    const updated = [...apportionments];
    updated.splice(index, 1);
    setApportionments(updated);
  };

  const handleApportionmentChange = (index: number, key: string, value: any) => {
    const updated = [...apportionments];
    updated[index] = { ...updated[index], [key]: value };
    setApportionments(updated);
  };

  const handleTypeToggle = (selectedType: 'income' | 'expense') => {
    setType(selectedType);
    setValidationError('');
  };

  const handleSubmit = (e: React.FormEvent, saveAndNew: boolean) => {
    e.preventDefault();
    setValidationError('');

    if (!description.trim()) {
      setValidationError('A descrição é obrigatória.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError('Por favor, informe um valor maior que zero.');
      return;
    }

    // Validate apportionment sum
    if (enableApportionment) {
      const sum = apportionments.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);
      if (sum !== 100) {
        setValidationError(`A soma dos percentuais do rateio deve ser exatamente 100% (atualmente está em ${sum}%).`);
        return;
      }
    }

    const payload = {
      description,
      amount: numericAmount,
      type,
      payment_method: accountCard.toLowerCase().includes('cartão') ? 'Cartão' : 'Transferência',
      status: isCompleted ? 'paid' : 'pending',
      date: competencyDate,
      competency_date: competencyDate,
      due_date: dueDate,
      patient_id: type === 'income' ? (Number(patientId) || null) : null,
      patient_name: type === 'income' 
        ? patients.find(p => p.id === Number(patientId))?.name 
        : (supplierText || 'Fornecedor avulso'),
      responsible,
      category,
      cost_center: costCenter,
      apportionment: enableApportionment ? apportionments : null,
      installments,
      account_card: accountCard,
      notes
    };

    onSave(payload, saveAndNew);

    if (saveAndNew) {
      // Reset for next entry
      setDescription('');
      setAmount('');
      setValidationError('');
    }
  };

  const themeColor = type === 'income' ? 'emerald' : 'red';
  const themeAccentHex = type === 'income' ? '#10b981' : '#ef4444';

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 md:p-6 border-b border-gray-100 flex items-center justify-between ${
          type === 'income' ? 'bg-emerald-50/50' : 'bg-red-50/50'
        }`}>
          <div>
            <h3 className={`text-lg md:text-xl font-bold ${
              type === 'income' ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {editingRecord 
                ? `Editar ${type === 'income' ? 'Entrada' : 'Saída'}` 
                : `Nova ${type === 'income' ? 'entrada' : 'saída'}`
              }
            </h3>
            <p className="text-xs text-gray-500 mt-1">Preencha os dados do lançamento financeiro abaixo.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 text-left">
          
          {/* Fast Type Toggle (Only active if creating a new one) */}
          {!editingRecord && (
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeToggle('income')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className={`w-2 h-2 rounded-full bg-emerald-500`} />
                <span>Nova Entrada (Recebimento)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeToggle('expense')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className={`w-2 h-2 rounded-full bg-red-500`} />
                <span>Nova Saída (Despesa / Pagamento)</span>
              </button>
            </div>
          )}

          {/* Core Fields Grid */}
          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Descrição</label>
              <input
                required
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800"
                placeholder={type === 'income' ? 'Ex: Mensalidade Pacote Estética, Venda de Creme' : 'Ex: Compra de Toxina, Aluguel da Sala, Luz'}
              />
            </div>

            {/* Competency & Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Competência</label>
                <div className="relative">
                  <input
                    required
                    type="date"
                    value={competencyDate}
                    onChange={e => setCompetencyDate(e.target.value)}
                    className="w-full text-xs md:text-sm pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Valor</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="R$ 0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full text-xs md:text-sm pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-bold text-gray-800"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</div>
                </div>
              </div>
            </div>

            {/* Client / Supplier & Responsible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {type === 'income' ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Cliente (Paciente)</label>
                  <select
                    value={patientId}
                    onChange={e => setPatientId(e.target.value)}
                    className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                  >
                    <option value="">Nenhum (Cliente Avulso)</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Fornecedor</label>
                  <input
                    type="text"
                    value={supplierText}
                    onChange={e => setSupplierText(e.target.value)}
                    className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800"
                    placeholder="Selecione ou digite o fornecedor..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Responsável</label>
                <select
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                >
                  {responsiblesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category & Cost Center */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-bold">Categoria</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400 font-bold">Centro de Custo</label>
                <select
                  value={costCenter}
                  onChange={e => setCostCenter(e.target.value)}
                  className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                >
                  {costCenters.map(cc => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Apportionment (Rateio) section */}
            <div className="border border-gray-100 rounded-xl p-3.5 space-y-3 bg-gray-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableApportionment"
                    checked={enableApportionment}
                    onChange={e => setEnableApportionment(e.target.checked)}
                    className={`w-4 h-4 text-${themeColor}-600 border-gray-300 rounded-sm focus:ring-${themeColor}-500`}
                  />
                  <label htmlFor="enableApportionment" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Habilitar Rateio
                  </label>
                </div>
                {enableApportionment && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-${themeColor}-50 text-${themeColor}-700 border border-${themeColor}-100`}>
                    Nova funcionalidade
                  </span>
                )}
              </div>

              {enableApportionment && (
                <div className="space-y-2.5 pt-2 border-t border-gray-100/80">
                  {apportionments.map((app, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={app.costCenter}
                        onChange={e => handleApportionmentChange(idx, 'costCenter', e.target.value)}
                        className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#c5b49f]"
                      >
                        {costCenters.map(cc => (
                          <option key={cc} value={cc}>{cc}</option>
                        ))}
                      </select>
                      <div className="relative w-24">
                        <input
                          type="number"
                          placeholder="0"
                          value={app.percentage}
                          onChange={e => handleApportionmentChange(idx, 'percentage', parseFloat(e.target.value) || 0)}
                          className="w-full text-xs pr-7 pl-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#c5b49f] font-bold text-right"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">%</span>
                      </div>
                      {apportionments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveApportionment(idx)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddApportionment}
                    className={`text-xs font-bold text-${themeColor}-700 hover:text-${themeColor}-800 flex items-center gap-1 mt-1 transition-colors cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Centro de Custo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Condition Header */}
            <h4 className="text-xs font-bold text-gray-800 pt-2 border-t border-gray-100">
              Condição de {type === 'income' ? 'recebimento' : 'pagamento'}
            </h4>

            {/* Condition fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Vencimento</label>
                <div className="relative">
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full text-xs md:text-sm pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Conta/Cartão</label>
                <select
                  value={accountCard}
                  onChange={e => setAccountCard(e.target.value)}
                  className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                >
                  <option value="">Selecione...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.name}>{w.name} ({w.type})</option>
                  ))}
                  <option value="CARTÃO ITAU BUSINESS">CARTÃO ITAU BUSINESS</option>
                  <option value="CARTÃO SANTANDER">CARTÃO SANTANDER</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Parcelamento</label>
                <select
                  value={installments}
                  onChange={e => setInstallments(e.target.value)}
                  className="w-full text-xs md:text-sm px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#c5b49f] font-semibold text-gray-800 bg-white"
                >
                  {installmentOptions.map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-start h-full pt-6 pl-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={e => setIsCompleted(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8c7457]"></div>
                  </div>
                  <span className="text-xs font-bold text-gray-700">
                    {type === 'income' ? 'Recebimento realizado' : 'Pagamento realizado'}
                  </span>
                </label>
              </div>
            </div>

            {/* Expandable More Options (Mais opções) */}
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/20">
              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="w-full px-4 py-3 text-left font-bold text-xs text-gray-600 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>+ Mais opções (Observações e arquivos)</span>
                <span className="text-gray-400 text-base">{showMoreOptions ? '−' : '+'}</span>
              </button>
              {showMoreOptions && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Observações adicionais</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-[#c5b49f]"
                      placeholder="Alguma anotação complementar sobre esta transação..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition-all text-center cursor-pointer"
            >
              Cancelar
            </button>
            <div className="flex-1" />
            
            {/* Save and create another */}
            {!editingRecord && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer"
              >
                Salvar e lançar outra
              </button>
            )}

            <button
              type="submit"
              className={`w-full sm:w-auto font-bold py-3 px-6 rounded-xl text-xs transition-all shadow-md text-white cursor-pointer`}
              style={{ backgroundColor: themeAccentHex }}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
