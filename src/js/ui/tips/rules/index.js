// rules/index.js

// Outer rules
import { WelcomeRule } from './outer/WelcomeRule';
import { FollowupRule } from './outer/FollowupRule';
import { ReturningRule } from './outer/ReturningRule';
import { ReconnectRule } from './outer/ReconnectRule';
import { ActiveReturnRule } from './outer/ActiveReturnRule';

// Inner rules

// Группы по категориям
export const rules = {
    outer: {
        WelcomeRule,
        FollowupRule,
        ReturningRule,
        ReconnectRule,
        ActiveReturnRule,
    },
    inner: {},
};

// Упорядоченные массивы правил (для движка)
export const outerRules = [
    WelcomeRule,
    FollowupRule,
    ReturningRule,
    ReconnectRule,
    ActiveReturnRule,
];

export const innerRules = [];

// Все правила вместе (outer идут раньше inner)
export const allRules = [...outerRules, ...innerRules];
