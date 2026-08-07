import { useState, useEffect } from 'react';
import { Wallet, FinancialRecord } from '../types';
import { X, Check, ArrowRight, AlertCircle, RefreshCw, FileText, Info, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet | null;
  records: FinancialRecord[];
  onReconcile: (reconciledTransactions: any[]) => void;
}

interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  matchedId?: number;
  status: 'unmatched' | 'matched' | 'created';
}

export default function ReconciliationModal({
  isOpen,
  onClose,
  wallet,
  records,
  onReconcile
}: ReconciliationModalProps) {
  const [statementTrans, setStatementTrans] = useState<StatementTransaction[]>([]);
  const [selectedStatementItem, setSelectedStatementItem] = useState<StatementTransaction | null>(null);
  const [selectedInternalItem, setSelectedInternalItem] = useState<number | null>(null);

  // Generate mock statement transactions based on active wallet when modal is opened
  useEffect(() => {
    if (wallet && isOpen) {
      // Create some realistic transactions from bank statement
      const today = new Date();
      const mockStatement: StatementTransaction[] = [
        {
          id: 'bank_1',
          date: format(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          description: 'PIX RECEBIDO - ANA OLIVEIRA SANTOS',
          amount: 250.00,
          type: 'credit',
          status: 'unmatched'
        },
        {
          id: 'bank_2',
          date: format(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          description: 'TARIFA BANCARIA RECORRENTE',
          amount: -15.90,
          type: 'debit',
          status: 'unmatched'
        },
        {
          id: 'bank_3',
          date: format(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          description: 'DEBITO CARTAO - COMPRA MATERIAL MEDICO',
          amount: -540.00,
          type: 'debit',
          status: 'unmatched'
        },
        {
          id: 'bank_4',
          date: format(new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          description: 'PIX RECEBIDO - CLINICA ESTETICA DEVOLUCAO',
          amount: 120.00,
          type: 'credit',
          status: 'unmatched'
        }
      ];

      // Auto-match if there is an exact date/amount match in the system records
      const updated = mockStatement.map(stmt => {
        const potentialMatch = records.find(rec => 
          rec.status === 'pending' &&
          Math.abs(rec.amount) === Math.abs(stmt.amount) &&
          (rec.type === 'income' ? 'credit' : 'debit') === stmt.type
        );
        if (potentialMatch) {
          return {
            ...stmt,
            matchedId: potentialMatch.id,
            status: 'matched' as const
          };
        }
        return stmt;
      });

      setStatementTrans(updated);
      setSelectedStatementItem(updated[0] || null);
    }
  }, [wallet, isOpen, records]);

  if (!isOpen || !wallet) return null;

  // Filter pending system records that could match the selected statement item
  const matchingCandidates = records.filter(rec => {
    if (!selectedStatementItem) return false;
    // Show pending items of the same direction (credit/income, debit/expense)
    const isIncome = selectedStatementItem.type === 'credit';
    return rec.status === 'pending' && rec.type === (isIncome ? 'income' : 'expense');
  });

  const handleMatch = () => {
    if (!selectedStatementItem || !selectedInternalItem) return;

    setStatementTrans(prev => prev.map(item => {
      if (item.id === selectedStatementItem.id) {
        return {
          ...item,
          matchedId: selectedInternalItem,
          status: 'matched'
        };
      }
      return item;
    }));

    // Select next unmatched
    const remaining = statementTrans.filter(i => i.id !== selectedStatementItem.id && i.status === 'unmatched');
    if (remaining.length > 0) {
      setSelectedStatementItem(remaining[0]);
    } else {
      setSelectedStatementItem(null);
    }
    setSelectedInternalItem(null);
  };

  const handleCreateAndReconcile = () => {
    if (!selectedStatementItem) return;
    
    // Simulate creating a new record and matching immediately
    setStatementTrans(prev => prev.map(item => {
      if (item.id === selectedStatementItem.id) {
        return {
          ...item,
          status: 'created'
        };
      }
      return item;
    }));

    // Add to system (simulate)
    const mockCreatedId = Math.floor(Math.random() * 10000);
    const mockNewRecord: Partial<FinancialRecord> = {
      id: mockCreatedId,
      description: selectedStatementItem.description,
      amount: Math.abs(selectedStatementItem.amount),
      type: selectedStatementItem.type === 'credit' ? 'income' : 'expense',
      status: 'paid',
      date: selectedStatementItem.date,
      account_card: wallet.name
    };

    onReconcile([mockNewRecord]);

    // Select next unmatched
    const remaining = statementTrans.filter(i => i.id !== selectedStatementItem.id && i.status === 'unmatched');
    if (remaining.length > 0) {
      setSelectedStatementItem(remaining[0]);
    } else {
      setSelectedStatementItem(null);
    }
    setSelectedInternalItem(null);
  };

  const handleSaveAllReconciliation = () => {
    // Collect all matched items
    const matches = statementTrans.filter(item => item.status === 'matched' && item.matchedId);
    onReconcile(matches);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-4 max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8c7457]/10 text-[#8c7457] rounded-xl">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Conciliação Bancária: {wallet.name}
              </h3>
              <p className="text-xs text-gray-500">Concilie extratos bancários com os lançamentos do sistema Gestto.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content Panel Splits */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden max-h-[65vh]">
          
          {/* Left Panel: Bank Statement (45% space) */}
          <div className="md:col-span-5 border-r border-gray-100 p-4 md:p-5 flex flex-col overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Transações do Extrato (BB)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">Importado hoje</span>
            </div>

            <div className="space-y-2.5">
              {statementTrans.map((item) => {
                const isSelected = selectedStatementItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedStatementItem(item);
                      setSelectedInternalItem(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-[#fbf9f5] border-[#c5b49f] ring-2 ring-[#c5b49f]/10 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">{item.description}</span>
                      <span className={`text-xs font-black shrink-0 ${
                        item.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.amount > 0 ? '+' : ''}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-semibold">
                      <span>{item.date.split('-').reverse().join('/')}</span>
                      
                      {item.status === 'matched' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-0.5 font-bold">
                          <Check className="w-3 h-3" /> Conciliado
                        </span>
                      )}
                      {item.status === 'created' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-100 flex items-center gap-0.5 font-bold">
                          <FileText className="w-3 h-3" /> Criado e Pago
                        </span>
                      )}
                      {item.status === 'unmatched' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-yellow-50 text-yellow-600 border border-yellow-100 font-bold">
                          Pendente
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Matching workspace (55% space) */}
          <div className="md:col-span-7 p-4 md:p-5 flex flex-col overflow-y-auto space-y-4 bg-gray-50/20">
            {selectedStatementItem ? (
              <div className="space-y-4 text-left">
                {/* Selected Item Recap Card */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Trabalhando no item do extrato:</span>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-800">{selectedStatementItem.description}</span>
                    <span className={`font-black text-sm ${
                      selectedStatementItem.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedStatementItem.amount)}
                    </span>
                  </div>
                </div>

                {/* Match Candidates List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">
                    Selecione um lançamento pendente no Gestto para conciliar:
                  </span>

                  {matchingCandidates.length === 0 ? (
                    <div className="p-5 text-center bg-white border border-gray-100 rounded-xl space-y-2">
                      <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto" />
                      <p className="text-xs font-semibold text-gray-600">Não encontramos lançamentos pendentes com o mesmo perfil.</p>
                      <button
                        type="button"
                        onClick={handleCreateAndReconcile}
                        className="px-4 py-2 bg-[#8c7457] hover:bg-[#735e45] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Lançar no Sistema e Conciliar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {matchingCandidates.map(rec => {
                        const isMatchSelected = selectedInternalItem === rec.id;
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => setSelectedInternalItem(rec.id)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${
                              isMatchSelected 
                                ? 'bg-emerald-50/20 border-emerald-500 shadow-sm' 
                                : 'bg-white border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-gray-800">{rec.description}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">Vence em: {rec.date.split('-').reverse().join('/')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-700">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isMatchSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'
                              }`}>
                                {isMatchSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* Manual Reconcile Button */}
                      {selectedInternalItem && (
                        <button
                          type="button"
                          onClick={handleMatch}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmar Conciliação Manual</span>
                        </button>
                      )}

                      {/* Quick launch as unmatched */}
                      <div className="text-center pt-1.5">
                        <span className="text-xs text-gray-400">ou se for uma movimentação avulsa: </span>
                        <button
                          type="button"
                          onClick={handleCreateAndReconcile}
                          className="text-xs text-[#8c7457] hover:underline font-bold bg-transparent border-0 inline-flex items-center gap-1 cursor-pointer"
                        >
                          Lançar avulso agora
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-3 bg-white border border-gray-100 rounded-2xl">
                <Check className="w-10 h-10 text-emerald-500" />
                <h4 className="text-sm font-bold text-gray-800">Tudo Pronto nesta Seção!</h4>
                <p className="text-xs text-gray-400 max-w-xs">Não existem mais transações pendentes de conciliação neste lote.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3 bg-gray-50/50">
          <div className="text-left text-[11px] text-gray-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#8c7457]" />
            <span>Ao concluir, os lançamentos associados mudarão de "Pendente" para "Pago".</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={handleSaveAllReconciliation}
            className="px-5 py-2.5 bg-[#8c7457] hover:bg-[#735e45] text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
          >
            Salvar e Concluir Conciliação
          </button>
        </div>
      </div>
    </div>
  );
}
