export function getEffectiveAttackSpeed(
	baseAttackSpeed: number,
	frenzyStacks: number,
	tapFrenzyBonus: number
): number {
	return baseAttackSpeed * (1 + frenzyStacks * tapFrenzyBonus);
}

export function getAttackIntervalMs(attackSpeed: number): number {
	if (attackSpeed <= 0) return Infinity;
	return 1000 / attackSpeed;
}
