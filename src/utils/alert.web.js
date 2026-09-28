// React Native Web Alert does not display dialogs. Browser dialogs preserve confirmations.
export const Alert = {
  alert(title, message = '', buttons = []) {
    const text = `${title}\n\n${message}`;
    if (buttons.length > 1) {
      const action = buttons.find(button => button.style !== 'cancel');
      if (window.confirm(text)) action?.onPress?.();
      else buttons.find(button => button.style === 'cancel')?.onPress?.();
    } else {
      window.alert(text);
      buttons[0]?.onPress?.();
    }
  },
};
