export const formatAmount = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount || 0));
};

export const formatDate = (dateString: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatMemberName = (member?: any) => {
  if (!member) {
    return '';
  }
  if (member.name) {
    return member.name;
  }
  if (!member.user) {
    return '';
  }
  return `${member.user.firstName ?? ''} ${member.user.lastName ?? ''}`.trim();
};

export const normalizeResponseList = (result: PromiseSettledResult<any>): any[] => {
  if (result.status !== 'fulfilled') {
    return [];
  }
  const payload = result.value;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};
