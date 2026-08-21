import { IRulesetEngine } from './types';
import { CasualRulesetEngine } from './CasualRulesetEngine';
import { PordiRulesetEngine } from './PordiRulesetEngine';
import { OradoRulesetEngine } from './OradoRulesetEngine';
import { RulesetMode } from '@/types/domino';

export function getRulesetEngine(mode: RulesetMode | string): IRulesetEngine {
  const normalizedMode = String(mode).toUpperCase();
  switch (normalizedMode) {
    case 'PB_PORDI':
      return new PordiRulesetEngine();
    case 'PB_ORADO':
      return new OradoRulesetEngine();
    case 'CASUAL':
    default:
      return new CasualRulesetEngine();
  }
}
