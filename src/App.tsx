import { useState, useMemo } from 'react';
import { Leaf, Sun, Scale, Calculator, Info, Coins, ArrowRight } from 'lucide-react';

const INGREDIENTS = {
  milho: { name: "Milho", ndt: 85, pb: 8, defaultPrice: 1.00 },
  sorgo: { name: "Sorgo", ndt: 76.5, pb: 9, defaultPrice: 0.80 },
  soja: { name: "Farelo de Soja", ndt: 80, pb: 46, defaultPrice: 2.50 },
  algodao: { name: "Farelo de Algodão", ndt: 70, pb: 28, defaultPrice: 1.50 },
  ureia: { name: "Ureia Pecuária", nnp: 281, defaultPrice: 3.00 },
  nucleo: { name: "Núcleo Mineral", defaultPrice: 4.00 }
};

type Season = 'aguas' | 'seca';

interface Recipe {
  milho: number;
  sorgo: number;
  soja: number;
  algodao: number;
  ureia: number;
  nucleo: number;
}

function App() {
  const [season, setSeason] = useState<Season>('aguas');
  const [ingredientInputs, setIngredientInputs] = useState(() => {
    return Object.entries(INGREDIENTS).reduce((acc, [key, data]) => {
      const defaultWeight = key === 'nucleo' ? 30 : 50;
      acc[key] = {
        price: (data.defaultPrice * defaultWeight).toFixed(2),
        weight: defaultWeight.toString()
      };
      return acc;
    }, {} as Record<string, { price: string, weight: string }>);
  });

  const prices = useMemo(() => {
    return Object.entries(ingredientInputs).reduce((acc, [key, data]) => {
      const p = parseFloat(data.price) || 0;
      const w = parseFloat(data.weight) || 1;
      acc[key as keyof typeof INGREDIENTS] = p / w;
      return acc;
    }, {} as Record<keyof typeof INGREDIENTS, number>);
  }, [ingredientInputs]);

  const [readyMadePrice, setReadyMadePrice] = useState<string>('');
  const [readyMadeWeight, setReadyMadeWeight] = useState<string>('30');

  const handleIngredientChange = (key: string, field: 'price' | 'weight', value: string) => {
    setIngredientInputs(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const calculation = useMemo(() => {
    // 1. Fixed
    const nucleoKg = 8;
    const ureiaKg = season === 'aguas' ? 2 : 3;

    // 2. Space Left
    const spaceLeftForBase = 100 - nucleoKg - ureiaKg;

    // Seasonal limits for protein
    // Aguas -> lower protein base needs, mostly energy
    // Seca -> higher protein base needs
    const proteinRequirementKg = season === 'aguas' ? 25 : 35;
    const energySpace = spaceLeftForBase - proteinRequirementKg;

    const recipe: Recipe = {
      milho: 0,
      sorgo: 0,
      soja: 0,
      algodao: 0,
      ureia: ureiaKg,
      nucleo: nucleoKg,
    };

    const insights: string[] = [];

    // Energy Rule
    const sorgoEquivalentPrice = prices.milho * 0.90;
    if (prices.sorgo <= sorgoEquivalentPrice) {
      recipe.sorgo = energySpace;
      insights.push(`Sorgo selecionado como base energética pois está viável custando menos de 90% do preço do Milho.`);
    } else {
      recipe.milho = energySpace;
      insights.push(`Milho mantido como base energética pois o Sorgo não atingiu o limite de desconto (>10% de diferença).`);
    }

    // Protein Rule
    const costPointSoja = prices.soja / INGREDIENTS.soja.pb;
    const costPointAlgodao = prices.algodao / INGREDIENTS.algodao.pb;

    if (costPointAlgodao < costPointSoja) {
      recipe.algodao = proteinRequirementKg;
      insights.push(`Farelo de Algodão selecionado pois o Custo por Ponto de Proteína (R$ ${costPointAlgodao.toFixed(3)}) é menor que o da Soja (R$ ${costPointSoja.toFixed(3)}).`);
    } else {
      recipe.soja = proteinRequirementKg;
      insights.push(`Farelo de Soja selecionado pois o Custo por Ponto de Proteína (R$ ${costPointSoja.toFixed(3)}) está compensando em relação ao Algodão (R$ ${costPointAlgodao.toFixed(3)}).`);
    }

    insights.push(season === 'aguas'
      ? `Regra das Águas aplicada: Nível de Ureia travado em 2% e menor inclusão de farelos devido à qualidade do pasto.`
      : `Regra da Seca aplicada: Ureia maximizada em 3% e maior volume de farelo para ajudar na digestão do pasto seco.`);

    const totalCost =
      (recipe.milho * prices.milho) +
      (recipe.sorgo * prices.sorgo) +
      (recipe.soja * prices.soja) +
      (recipe.algodao * prices.algodao) +
      (recipe.ureia * prices.ureia) +
      (recipe.nucleo * prices.nucleo);

    const costPerKg = totalCost / 100;

    // Totals
    const ndtTotal =
      ((recipe.milho * INGREDIENTS.milho.ndt) +
        (recipe.sorgo * INGREDIENTS.sorgo.ndt) +
        (recipe.soja * INGREDIENTS.soja.ndt) +
        (recipe.algodao * INGREDIENTS.algodao.ndt)) / 100;

    const pbTotal =
      ((recipe.milho * INGREDIENTS.milho.pb) +
        (recipe.sorgo * INGREDIENTS.sorgo.pb) +
        (recipe.soja * INGREDIENTS.soja.pb) +
        (recipe.algodao * INGREDIENTS.algodao.pb) +
        (recipe.ureia * INGREDIENTS.ureia.nnp)) / 100;

    return {
      recipe,
      totalCost,
      costPerKg,
      insights,
      ndtTotal,
      pbTotal
    };

  }, [season, prices]);

  const parsedReadyMadePrice = parseFloat(readyMadePrice);
  const parsedReadyMadeWeight = parseFloat(readyMadeWeight);
  const hasReadyMadeData = !isNaN(parsedReadyMadePrice) && !isNaN(parsedReadyMadeWeight) && parsedReadyMadeWeight > 0 && parsedReadyMadePrice > 0;

  const readyMadeCostPerKg = hasReadyMadeData ? (parsedReadyMadePrice / parsedReadyMadeWeight) : 0;
  const isMixingBetter = hasReadyMadeData ? calculation.costPerKg < readyMadeCostPerKg : false;
  const differencePerKg = hasReadyMadeData ? Math.abs(calculation.costPerKg - readyMadeCostPerKg) : 0;
  const differencePerBag = hasReadyMadeData ? differencePerKg * parsedReadyMadeWeight : 0;
  const percentDifference = hasReadyMadeData ? (differencePerKg / readyMadeCostPerKg) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-neutral-100 flex justify-center text-neutral-800">
      <div className="max-w-6xl w-full mx-auto space-y-6">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-900 flex items-center gap-3">
              <Scale className="w-8 h-8 text-emerald-600" />
              BoiTech Formulador
            </h1>
            <p className="text-neutral-500 mt-1 pl-11">Calculadora de custo mínimo para nutrir resultados.</p>
          </div>

          {/* Season Toggle */}
          <div className="card w-full md:w-auto p-1.5 flex bg-white/50 backdrop-blur border-emerald-100">
            <button
              onClick={() => setSeason('aguas')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${season === 'aguas' ? 'bg-emerald-600 text-white shadow-md transform -translate-y-0.5' : 'text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
            >
              <Leaf className="w-4 h-4" />
              Águas
            </button>
            <button
              onClick={() => setSeason('seca')}
              className={`flex-1 md:flex-none flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${season === 'seca' ? 'bg-amber-600 text-white shadow-md transform -translate-y-0.5' : 'text-neutral-500 hover:text-amber-700 hover:bg-amber-50'}`}
            >
              <Sun className="w-4 h-4" />
              Seca
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Inputs Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card glass-effect relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="card-header pb-2">
                <h2 className="card-title text-emerald-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-600" />
                  Cotação de Ingredientes
                </h2>
                <p className="text-sm text-neutral-500">Insira o preço por Kg para recalcular a batida</p>
              </div>

              <div className="card-content mt-4 space-y-4">
                {Object.entries(INGREDIENTS).map(([key, data]) => {
                  const inputData = ingredientInputs[key];
                  const pricePerKg = prices[key as keyof typeof prices];
                  return (
                    <div key={key} className="flex flex-col gap-2 p-3 bg-neutral-50/50 border border-neutral-200/60 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="font-semibold text-neutral-700 text-sm flex items-center gap-2">
                          {data.name}
                          {key === 'nucleo' && <span className="text-[10px] text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold">Tabelado</span>}
                        </label>
                        <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          R$ {pricePerKg.toFixed(2)}/kg
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative group/input flex-1 flex items-center">
                          <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-neutral-500 font-medium font-mono text-xs group-focus-within/input:text-emerald-600 transition-colors">R$</span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={inputData.price}
                            onChange={(e) => handleIngredientChange(key, 'price', e.target.value)}
                            className="input-style pl-8 text-sm font-mono shadow-none border-neutral-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                            placeholder="Saco"
                          />
                        </div>

                        <div className="w-px bg-neutral-200 my-1"></div>

                        <div className="relative group/input w-28 flex items-center">
                          <div className="absolute left-0 inset-y-0 flex items-center pl-2.5 pointer-events-none">
                            <span className="text-neutral-500 font-medium font-mono text-xs group-focus-within/input:text-emerald-600 transition-colors">kg</span>
                          </div>
                          <input
                            type="number"
                            step="1"
                            value={inputData.weight}
                            onChange={(e) => handleIngredientChange(key, 'weight', e.target.value)}
                            className="input-style pl-8 pr-2 text-sm font-mono shadow-none border-neutral-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                            placeholder="Peso"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Readymade Product Input */}
            <div className="card glass-effect relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="card-header pb-2">
                <h2 className="card-title text-indigo-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-600" />
                  Comparativo de Mercado
                </h2>
                <p className="text-sm text-neutral-500">Preço do proteinado comercial pronto</p>
              </div>

              <div className="card-content mt-4 space-y-4">
                <div className="flex flex-col gap-1.5 group">
                  <label className="label text-neutral-600">Preço do Saco (R$)</label>
                  <div className="relative group/input flex items-center">
                    <div className="absolute left-0 inset-y-0 flex items-center pl-3.5 pointer-events-none">
                      <span className="text-neutral-500/80 font-medium font-mono text-sm group-focus-within/input:text-indigo-600 transition-colors">R$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={readyMadePrice}
                      onChange={(e) => setReadyMadePrice(e.target.value)}
                      className="input-style pl-10 font-mono shadow-sm"
                      placeholder="Ex: 120.00"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 group">
                  <div className="flex justify-between items-center">
                    <label className="label text-neutral-600 mb-0">Peso do Saco</label>
                    <div className="flex gap-1.5">
                      {['25', '30', '40'].map(w => (
                        <button
                          key={w}
                          onClick={() => setReadyMadeWeight(w)}
                          className={`text-xs px-2 py-0.5 rounded-md transition-colors border ${readyMadeWeight === w
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                            : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                            }`}
                        >
                          {w}kg
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative group/input flex items-center">
                    <div className="absolute left-0 inset-y-0 flex items-center pl-3.5 pointer-events-none">
                      <span className="text-neutral-500/80 font-medium font-mono text-sm group-focus-within/input:text-indigo-600 transition-colors">kg</span>
                    </div>
                    <input
                      type="number"
                      step="1"
                      value={readyMadeWeight}
                      onChange={(e) => setReadyMadeWeight(e.target.value)}
                      className="input-style pl-10 font-mono shadow-sm"
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-none shadow-lg transform transition hover:scale-[1.02] duration-300 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="p-6">
                  <p className="text-emerald-100 text-sm font-medium mb-1 drop-shadow-sm">Custo da Batida (100kg)</p>
                  <p className="text-3xl font-bold tracking-tight">
                    R$ {calculation.totalCost.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              <div className="card bg-white border-emerald-100 shadow-sm transform transition hover:scale-[1.02] duration-300">
                <div className="p-6">
                  <p className="text-neutral-500 text-sm font-medium mb-1">Custo por Kg</p>
                  <p className="text-3xl font-bold tracking-tight text-emerald-900">
                    R$ {calculation.costPerKg.toFixed(3).replace('.', ',')}
                  </p>
                </div>
              </div>
            </div>

            {hasReadyMadeData && (
              <div className={`card overflow-hidden shadow-sm border ${isMixingBetter ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className={`card-header pb-3 border-b ${isMixingBetter ? 'border-emerald-100/50' : 'border-red-100/50'}`}>
                  <h3 className={`font-semibold flex items-center gap-2 ${isMixingBetter ? 'text-emerald-900' : 'text-red-900'}`}>
                    <Scale className={`w-5 h-5 ${isMixingBetter ? 'text-emerald-600' : 'text-red-600'}`} />
                    Avaliador: Bater vs Comprar Pronto
                  </h3>
                </div>
                <div className="p-4 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 p-3 rounded-lg border border-white/40">
                      <div className="text-sm text-neutral-500 mb-1">Custo da Mistura</div>
                      <div className="font-mono text-lg font-semibold text-neutral-800">
                        R$ {calculation.costPerKg.toFixed(2).replace('.', ',')}<span className="text-xs text-neutral-500 font-normal">/kg</span>
                      </div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg border border-white/40">
                      <div className="text-sm text-neutral-500 mb-1">Produto Comercial</div>
                      <div className="font-mono text-lg font-semibold text-neutral-800">
                        R$ {readyMadeCostPerKg.toFixed(2).replace('.', ',')}<span className="text-xs text-neutral-500 font-normal">/kg</span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-3 rounded-lg ${isMixingBetter ? 'bg-emerald-100/80 text-emerald-800' : 'bg-red-100/80 text-red-800'}`}>
                    <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isMixingBetter ? 'text-emerald-600' : 'text-red-600'}`} />
                    <div className="text-sm leading-relaxed">
                      {isMixingBetter ? (
                        <>Fazer a mistura na fazenda é <strong>{percentDifference.toFixed(1)}% mais barato</strong>. Você economiza <strong>R$ {differencePerBag.toFixed(2).replace('.', ',')}</strong> a cada saco de {parsedReadyMadeWeight}kg produzido em relação ao produto comercial.</>
                      ) : (
                        <>Comprar o produto comercial está compensando mais. A sua mistura está <strong>{percentDifference.toFixed(1)}% mais cara</strong> que o produto comercial.</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card shadow-sm border-neutral-200">
              <div className="card-header border-b border-neutral-100 bg-neutral-50/50">
                <h3 className="card-title text-neutral-800 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-500" />
                  Melhor Receita para 100kg
                </h3>
              </div>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Ingrediente</th>
                      <th className="px-6 py-3 font-semibold text-right">Quantidade</th>
                      <th className="px-6 py-3 font-semibold text-right">Particip. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {Object.entries(calculation.recipe).map(([key, kg]) => {
                      if (kg === 0) return null;
                      const name = INGREDIENTS[key as keyof typeof INGREDIENTS].name;
                      return (
                        <tr key={key} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-neutral-700 flex items-center gap-2">
                            {kg > 30 ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> : <div className="w-1.5 h-1.5 rounded-full bg-neutral-300"></div>}
                            {name}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-neutral-600">{kg} kg</td>
                          <td className="px-6 py-3.5 text-right font-mono text-emerald-600 font-medium">
                            {((kg / 100) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-emerald-50/50 border-t border-emerald-100 text-emerald-900 font-semibold">
                    <tr>
                      <td className="px-6 py-4">Total Formulamento</td>
                      <td className="px-6 py-4 text-right font-mono text-lg">100 kg</td>
                      <td className="px-6 py-4 text-right">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="card border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/30 overflow-hidden shadow-sm">
              <div className="card-header pb-2 border-b border-amber-100/50">
                <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-500" />
                  Inteligência Nutricional
                </h3>
              </div>
              <div className="card-content mt-4">
                <ul className="space-y-3">
                  {calculation.insights.map((insight, index) => (
                    <li key={index} className="flex gap-3 text-sm text-amber-800 leading-relaxed items-start">
                      <ArrowRight className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800 mt-6 font-medium shadow-sm">
              <div className="flex-1 text-center border-r border-blue-200">
                Estimativa NDT: <span className="font-bold text-blue-900 text-base ml-1">{calculation.ndtTotal.toFixed(1)}%</span>
              </div>
              <div className="flex-1 text-center">
                Estimativa PB: <span className="font-bold text-blue-900 text-base ml-1">{calculation.pbTotal.toFixed(1)}%</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
