import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, QrCode, Copy, Check, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { getActiveStoreSlug } from '../utils/multiStore';

interface BillingInfo {
  billing_status: 'pago' | 'atraso' | 'pendente';
  billing_due_date: string;
  billing_last_paid: string;
  is_blocked: boolean;
  monthly_fee: number;
}

export default function Billing() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  
  // Card Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const slug = getActiveStoreSlug();

  const fetchBillingInfo = () => {
    setLoading(true);
    fetch('/api/billing/info')
      .then(res => {
        if (!res.ok) throw new Error('Erro ao buscar dados de faturamento.');
        return res.json();
      })
      .then((data: BillingInfo) => {
        setBilling(data);
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleCopyPix = () => {
    const pixKey = "00020101021226950014br.gov.bcb.pix2573mercadopago.com/qr/v2/5429188e-cba1-4bdf-99e2-e0dfc526a4595802BR5925Gestto%20SaaS%20Payments6009Sao%20Paulo62070503***6304ED3B";
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setPaying(true);
    try {
      const res = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setShowPixModal(false);
          setPaymentSuccess(false);
          fetchBillingInfo();
          // Notify other components (bell, dashboard)
          window.dispatchEvent(new CustomEvent('billingUpdated'));
          window.dispatchEvent(new CustomEvent('appointmentsUpdated'));
        }, 3000);
      } else {
        alert("Erro ao registrar pagamento. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o gateway de pagamento.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-gray-500">
        <div className="w-10 h-10 border-4 border-[#a38e74] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold uppercase tracking-wider">Carregando dados de faturamento...</p>
      </div>
    );
  }

  const isOverdue = billing?.billing_status === 'atraso' || billing?.is_blocked;
  const formattedDueDate = billing?.billing_due_date 
    ? billing.billing_due_date.split('-').reverse().join('/') 
    : 'Não configurada';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 text-left">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mensalidade & Assinatura</h2>
          <p className="text-xs text-gray-500 mt-1 font-medium">Gerencie o pagamento da sua licença Gestto Multi-Lojas.</p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Ambiente Criptografado</span>
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className={`border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm text-left ${
        isOverdue 
          ? 'bg-red-50/50 border-red-200' 
          : 'bg-white border-[#ebdcd0]'
      }`}>
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              billing?.is_blocked 
                ? 'bg-red-600 text-white animate-pulse'
                : isOverdue 
                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {billing?.is_blocked ? 'Painel Bloqueado' : isOverdue ? 'Mensalidade em Atraso' : 'Assinatura Ativa'}
            </span>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Plano Mensal Premium</span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {billing?.is_blocked 
                ? 'Seu painel está suspenso devido a atrasos' 
                : isOverdue 
                ? 'Sua mensalidade está vencida' 
                : 'Parabéns! Sua mensalidade está em dia.'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {billing?.is_blocked 
                ? 'Regularize agora via Pix pelo Mercado Pago para reestabelecer seu acesso instantaneamente.' 
                : isOverdue 
                ? 'Realize o pagamento para evitar o bloqueio preventivo do sistema e das agendas.' 
                : 'Obrigado por sua parceria! Seu painel administrativo está liberado e com todos os recursos ativos.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
            <div>
              <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Próximo Vencimento</span>
              <span className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{formattedDueDate}</span>
            </div>
            {billing?.billing_last_paid && (
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Último Pagamento</span>
                <span className="text-sm font-bold text-gray-600">{billing.billing_last_paid.split('-').reverse().join('/')}</span>
              </div>
            )}
            <div>
              <span className="block text-[9px] uppercase font-bold text-gray-400 tracking-wider">Valor Mensal</span>
              <span className="text-sm font-extrabold text-[#8c7457]">R$ 149,90 / mês</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto shrink-0">
          <button
            onClick={() => setShowPixModal(true)}
            className="w-full md:w-auto bg-[#a38e74] hover:bg-[#8f7b62] text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
          >
            <span>Pagar Mensalidade</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security & Support Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-5 border border-gray-100 rounded-2xl bg-white flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Parceria de Sucesso</h4>
            <p className="text-xs text-gray-500 mt-1 leading-normal">
              Seu pagamento garante a infraestrutura e o isolamento completo de banco de dados no Turso Cloud, mantendo sua velocidade máxima.
            </p>
          </div>
        </div>

        <div className="p-5 border border-gray-100 rounded-2xl bg-white flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Checkout Seguro Mercado Pago</h4>
            <p className="text-xs text-gray-500 mt-1 leading-normal">
              A Gestto utiliza os serviços de proteção e recebimento do Mercado Pago. Seus pagamentos por Pix são aprovados imediatamente.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Checkout Modal (Mercado Pago Simulation) */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Header */}
            <div className="bg-[#009ee3] text-white p-6 text-left relative">
              <div className="flex items-center space-x-3">
                <div className="bg-white text-[#009ee3] px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wider">
                  MERCADO PAGO
                </div>
                <span className="text-xs font-semibold opacity-90">Gateway Oficial Gestto</span>
              </div>
              <h3 className="text-lg font-bold mt-2">Pagamento de Assinatura</h3>
              <p className="text-xs opacity-80 mt-1">Sua mensalidade expira em {formattedDueDate}</p>

              <button 
                onClick={() => setShowPixModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-100 font-bold text-sm focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Selector Tab */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all outline-none ${paymentMethod === 'pix' ? 'bg-white text-gray-900 border-b-2 border-[#009ee3]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Pix (Aprovação Instantânea)
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all outline-none ${paymentMethod === 'card' ? 'bg-white text-gray-900 border-b-2 border-[#009ee3]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Cartão de Crédito
              </button>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              {paymentSuccess ? (
                <div className="py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Pagamento Confirmado!</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Agradecemos seu pagamento via Mercado Pago! Seu acesso foi reestabelecido e estendido com sucesso.
                  </p>
                </div>
              ) : paymentMethod === 'pix' ? (
                <div className="space-y-5">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between text-left">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-blue-800 tracking-wider">Valor total</span>
                      <span className="text-lg font-black text-blue-900">R$ 149,90</span>
                    </div>
                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                      Pix ativo
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="w-40 h-40 border border-gray-200 rounded-2xl mx-auto p-2 flex items-center justify-center bg-white shadow-xs">
                    <QrCode className="w-full h-full text-gray-800" />
                  </div>

                  <p className="text-xs text-gray-500 font-medium">
                    Escaneie o QR Code acima no aplicativo do seu banco ou use a chave Pix Copia e Cola abaixo.
                  </p>

                  {/* Copy code input */}
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#009ee3] focus-within:bg-white transition-all">
                    <input 
                      type="text" 
                      readOnly 
                      value="00020101021226950014br.gov.bcb.pix2573mercadopago.com/qr/v2/5429188e-cba1-4bdf-99e2-e0dfc526a4595802BR5925Gestto%20SaaS%20Payments6009Sao%20Paulo62070503***6304ED3B"
                      className="w-full text-xs px-3 py-2.5 bg-transparent outline-none font-semibold text-gray-600 truncate"
                    />
                    <button 
                      onClick={handleCopyPix}
                      className="bg-gray-100 hover:bg-gray-200 text-[#009ee3] px-3.5 py-2.5 border-l border-gray-200 font-bold text-xs flex items-center space-x-1 transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleConfirmPayment}
                    disabled={paying}
                    className="w-full bg-[#009ee3] hover:bg-[#0089c7] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    <span>{paying ? 'Processando Pix...' : 'Confirmar Pagamento'}</span>
                    {!paying && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleConfirmPayment(); }} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome no Cartão</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="JOÃO SILVA COSTA"
                      className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#009ee3] focus:bg-white outline-none transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Número do Cartão</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      placeholder="4544 2873 9821 5429"
                      maxLength={19}
                      className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#009ee3] focus:bg-white outline-none transition-all font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Validade (MM/AA)</label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        placeholder="12/30"
                        maxLength={5}
                        className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#009ee3] focus:bg-white outline-none transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CVC / CVV</label>
                      <input
                        type="text"
                        required
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={3}
                        className="w-full text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#009ee3] focus:bg-white outline-none transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="w-full bg-[#009ee3] hover:bg-[#0089c7] text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-xs uppercase tracking-wider"
                  >
                    <span>{paying ? 'Processando Cartão...' : 'Confirmar Pagamento'}</span>
                    {!paying && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
