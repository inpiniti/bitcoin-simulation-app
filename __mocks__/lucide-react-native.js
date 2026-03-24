const React = require('react');
const { View } = require('react-native');

const createIcon = (name) => {
  const Icon = (props) => React.createElement(View, { testID: `icon-${name}`, ...props });
  Icon.displayName = name;
  return Icon;
};

module.exports = {
  Activity: createIcon('Activity'),
  MessageCircle: createIcon('MessageCircle'),
  Brain: createIcon('Brain'),
  Settings: createIcon('Settings'),
  ChevronRight: createIcon('ChevronRight'),
  ChevronDown: createIcon('ChevronDown'),
  AlertCircle: createIcon('AlertCircle'),
  CheckCircle: createIcon('CheckCircle'),
  XCircle: createIcon('XCircle'),
  Info: createIcon('Info'),
  Loader: createIcon('Loader'),
  RefreshCw: createIcon('RefreshCw'),
  TrendingUp: createIcon('TrendingUp'),
  TrendingDown: createIcon('TrendingDown'),
};
