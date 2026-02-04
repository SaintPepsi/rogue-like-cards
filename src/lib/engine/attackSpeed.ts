export function getEffectiveAttackSpeed(
	baseAttackSpeed: number,
	frenzyStacks: number,
	tapFrenzyBonus: number,
	attackSpeedBonus: number = 0
): number {
	return baseAttackSpeed * (1 + attackSpeedBonus) * (1 + frenzyStacks * tapFrenzyBonus);
}

export function getAttackIntervalMs(attackSpeed: number): number {
	if (attackSpeed <= 0) return Infinity;
	return 1000 / attackSpeed;
}
