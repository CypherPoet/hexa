import React, { PureComponent } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  Platform,
  AsyncStorage,
  Linking,
  Alert,
} from 'react-native';
import Fonts from './../common/Fonts';
import BottomSheet from 'reanimated-bottom-sheet';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Colors from '../common/Colors';
import DeviceInfo from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import TransparentHeaderModal from '../components/TransparentHeaderModal';
import CustodianRequestRejectedModalContents from '../components/CustodianRequestRejectedModalContents';
import MoreHomePageTabContents from '../components/MoreHomePageTabContents';
import SmallHeaderModal from '../components/SmallHeaderModal';
import AddModalContents from '../components/AddModalContents';
import QrCodeModalContents from '../components/QrCodeModalContents';
import FastBitcoinCalculationModalContents from '../components/FastBitcoinCalculationModalContents';
import { AppState } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import {
  TEST_ACCOUNT,
  REGULAR_ACCOUNT,
  SECURE_ACCOUNT,
  TRUSTED_CONTACTS,
  FAST_BITCOINS,
  DONATION_ACCOUNT,
} from '../common/constants/serviceTypes';
import AllAccountsContents from '../components/AllAccountsContents';
import SettingsContents from '../components/SettingsContents';
import { connect } from 'react-redux';
import NoInternetModalContents from '../components/NoInternetModalContents';
import NetInfo from '@react-native-community/netinfo';
import {
  downloadMShare,
  initHealthCheck,
  uploadRequestedShare,
} from '../store/actions/sss';
import { createRandomString } from '../common/CommonFunctions/timeFormatter';
import { updateAddressBookLocally } from '../store/actions/trustedContacts';
import { updateLastSeen } from '../store/actions/preferences';

import {
  approveTrustedContact,
  fetchEphemeralChannel,
  fetchTrustedChannel,
  clearPaymentDetails,
} from '../store/actions/trustedContacts';
import {
  updateFCMTokens,
  fetchNotifications,
  notificationsUpdated,
} from '../store/actions/notifications';
import { storeFbtcData } from '../store/actions/fbtc';
import {
  setCurrencyCode,
  setCurrencyToggleValue,
} from '../store/actions/preferences';
import { UsNumberFormat } from '../common/utilities';
import { getCurrencyImageByRegion } from '../common/CommonFunctions/index';
import ErrorModalContents from '../components/ErrorModalContents';
import ModalHeader from '../components/ModalHeader';
import TransactionDetails from './Accounts/TransactionDetails';
import Toast from '../components/Toast';
import firebase from 'react-native-firebase';
import NotificationListContent from '../components/NotificationListContent';
import { timeFormatter } from '../common/CommonFunctions/timeFormatter';
import Config from 'react-native-config';
import RelayServices from '../bitcoin/services/RelayService';
import AddContactAddressBook from './Contacts/AddContactAddressBook';
import TrustedContactRequest from './Contacts/TrustedContactRequest';
import config from '../bitcoin/HexaConfig';
import TrustedContactsService from '../bitcoin/services/TrustedContactsService';
import TransactionsContent from '../components/home/transaction-content';
import HomeList from '../components/home/home-list';
import HomeHeader from '../components/home/home-header';
import idx from 'idx';
import CustomBottomTabs from '../components/home/custom-bottom-tabs';
import { initialCardData, closingCardData } from '../stubs/initialCardData';
import { initialTransactionData } from '../stubs/initialTransactionData';
import {
  fetchDerivativeAccBalTx,
  addTransferDetails,
} from '../store/actions/accounts';
import RegularAccount from '../bitcoin/services/accounts/RegularAccount';
import {
  TrustedContactDerivativeAccount,
  trustedChannelActions,
  DonationDerivativeAccountElements,
} from '../bitcoin/utilities/Interface';
import moment from 'moment';
import { withNavigationFocus } from 'react-navigation';
import Loader from '../components/loader';
import CustodianRequestModalContents from '../components/CustodianRequestModalContents';
import semver from 'semver';
import {
  updatePreference,
  setFCMToken,
  setSecondaryDeviceAddress,
} from '../store/actions/preferences';
import * as Permissions from 'expo-permissions';
import Bitcoin from '../bitcoin/utilities/accounts/Bitcoin';

function isEmpty(obj) {
  return Object.keys(obj).every((k) => !Object.keys(obj[k]).length);
}

export const isCompatible = async (method: string, version: string) => {
  if (!semver.valid(version)) {
    // handling exceptions: off standard versioning
    if (version === '0.9') version = '0.9.0';
    else if (version === '1.0') version = '1.0.0';
  }

  if (version && semver.gt(version, DeviceInfo.getVersion())) {
    // checking compatibility via Relay
    const res = await RelayServices.checkCompatibility(method, version);
    if (res.status !== 200) {
      console.log('Failed to check compatibility');
      return true;
    }

    const { compatible, alternatives } = res.data;
    if (!compatible) {
      if (alternatives) {
        if (alternatives.update)
          Alert.alert('Update your app inorder to process this link/QR');
        else if (alternatives.message) Alert.alert(alternatives.message);
      } else {
        Alert.alert('Incompatible link/QR, updating your app might help');
      }
      return false;
    }
    return true;
  }
  return true;
};

const getIconByAccountType = (type) => {
  if (type == 'saving') {
    return require('../assets/images/icons/icon_regular.png');
  } else if (type == 'regular') {
    return require('../assets/images/icons/icon_regular.png');
  } else if (type == 'secure') {
    return require('../assets/images/icons/icon_secureaccount.png');
  } else if (type == 'test') {
    return require('../assets/images/icons/icon_test.png');
  } else if (type === 'Donation Account') {
    return require('../assets/images/icons/icon_donation_hexa.png');
  } else {
    return require('../assets/images/icons/icon_test.png');
  }
};

const TransactionHeader = ({ openCloseModal }) => {
  return (
    <TouchableOpacity
      activeOpacity={10}
      onPress={() => openCloseModal()}
      style={styles.modalHeaderContainer}
    >
      <View style={styles.modalHeaderHandle} />
      <Text style={styles.modalHeaderTitleText}>{'Transactions'}</Text>
    </TouchableOpacity>
  );
};

const TrustedContactRequestContent = ({
  bottomSheetRef,
  trustedContactRequest,
  recoveryRequest,
  onPressAccept,
  onPressReject,
  onPhoneNumberChange,
  isRequestModalOpened,
}) => {
  if (!trustedContactRequest && !recoveryRequest) return;
  let { requester, hintType, hint, isGuardian, isQR, isRecovery } =
    trustedContactRequest || recoveryRequest;

  return (
    <TrustedContactRequest
      isRequestModalOpened={isRequestModalOpened}
      isQR={isQR}
      inputType={
        hintType === 'num' ? 'phone' : hintType === 'eml' ? 'email' : null
      }
      isGuardian={isGuardian}
      isRecovery={isRecovery}
      hint={hint}
      bottomSheetRef={bottomSheetRef}
      trustedContactName={requester}
      onPressAccept={(key) => onPressAccept(key)}
      onPressReject={(key) => {
        onPressReject(key);
      }}
      onPhoneNumberChange={(text) => {
        onPhoneNumberChange(text);
      }}
    />
  );
};

interface HomeStateTypes {
  notificationLoading: boolean;
  notificationData?: any[];
  cardData?: any[];
  switchOn: boolean;
  CurrencyCode: string;
  balances: any;
  selectedBottomTab: string;
  transactions: any[];
  modalData: any;
  knowMoreBottomSheetsFlag: boolean;
  qrBottomSheetsFlag: boolean;
  tabBarIndex: number;
  addSubBottomSheetsFlag: boolean;
  openModal: string;
  atCloseEnd: boolean;
  loading: boolean;
  secondaryDeviceOtp: any;
  selectedTransactionItem: any;
  deepLinkModalOpen: boolean;
  currencyCode: string;
  errorMessageHeader: string;
  errorMessage: string;
  buttonText: string;
  selectedContact: any[];
  notificationDataChange: boolean;
  appState: string;
  fbBTCAccount: any;
  transactionsLoading: boolean;
  trustedContactRequest: any;
  recoveryRequest: any;
  custodyRequest: any;
  isLoadContacts: boolean;
  canNavigate: boolean;
  lastActiveTime: string;
  isContactOpen: boolean;
  isCameraOpen: boolean;
  isLoading: boolean;
  isRequestModalOpened: boolean;
  isBalanceLoading: boolean;
  addContactModalOpened: boolean;
}

interface HomePropsTypes {
  navigation: any;
  notificationList: any[];
  exchangeRates: any[];
  accounts: any[];
  walletName: string;
  UNDER_CUSTODY: any;
  fetchNotifications: any;
  updateFCMTokens: any;
  downloadMShare: any;
  approveTrustedContact: any;
  fetchTrustedChannel: any;
  fetchEphemeralChannel: any;
  uploadRequestedShare: any;
  s3Service: any;
  initHealthCheck: any;
  overallHealth: any;
  fetchDerivativeAccBalTx: any;
  addTransferDetails: any;
  paymentDetails: any;
  clearPaymentDetails: any;
  trustedContacts: TrustedContactsService;
  isFocused: boolean;
  notificationListNew: any;
  notificationsUpdated: any;
  FBTCAccountData: any;
  storeFbtcData: any;
  setCurrencyCode: any;
  currencyCode: any;
  setCurrencyToggleValue: any;
  currencyToggleValue: any;
  updatePreference: any;
  fcmTokenValue: any;
  setFCMToken: any;
  setSecondaryDeviceAddress: any;
  secondaryDeviceAddressValue: any;
  releaseCasesValue: any;
  updateLastSeen: any;
}

class HomeUpdated extends PureComponent<HomePropsTypes, HomeStateTypes> {
  focusListener: any;
  appStateListener: any;
  firebaseNotificationListener: any;
  notificationOpenedListener: any;
  NoInternetBottomSheet: any;
  unsubscribe: any;

  static whyDidYouRender = true;

  constructor(props) {
    super(props);
    this.focusListener = null;
    this.appStateListener = null;
    this.NoInternetBottomSheet = React.createRef();
    this.unsubscribe = null;
    this.state = {
      notificationData: [],
      cardData: [],
      switchOn: false,
      CurrencyCode: 'USD',
      balances: {},
      qrBottomSheetsFlag: false,
      selectedBottomTab: 'Transactions',
      transactions: [],
      knowMoreBottomSheetsFlag: false,
      modalData: initialTransactionData,
      tabBarIndex: 999,
      addSubBottomSheetsFlag: false,
      openModal: 'closed',
      atCloseEnd: false,
      loading: false,
      secondaryDeviceOtp: {},
      selectedTransactionItem: null,
      deepLinkModalOpen: false,
      currencyCode: 'USD',
      errorMessageHeader: '',
      errorMessage: '',
      buttonText: '',
      selectedContact: [],
      notificationDataChange: false,
      appState: '',
      fbBTCAccount: {},
      transactionsLoading: true,
      trustedContactRequest: null,
      recoveryRequest: null,
      custodyRequest: null,
      isLoadContacts: false,
      canNavigate: false,
      lastActiveTime: moment().toISOString(),
      isContactOpen: false,
      isCameraOpen: false,
      notificationLoading: true,
      isLoading: true,
      isRequestModalOpened: false,
      isBalanceLoading: true,
      addContactModalOpened: false,
    };
  }

  onPressNotifications = async () => {
    let notificationList = JSON.parse(
      await AsyncStorage.getItem('notificationList'),
    );
    let tmpList = [];
    if (notificationList) {
      for (let i = 0; i < notificationList.length; i++) {
        const element = notificationList[i];
        let obj = {
          ...element,
          read: element.isMandatory ? false : true,
        };
        tmpList.push(obj);
      }
    }
    await AsyncStorage.setItem('notificationList', JSON.stringify(tmpList));
    tmpList.sort(function (left, right) {
      return moment.utc(right.date).unix() - moment.utc(left.date).unix();
    });
    this.setState({
      notificationData: tmpList,
      notificationDataChange: !this.state.notificationDataChange,
    });
    setTimeout(() => {
      this.setState({ notificationLoading: false });
    }, 500);
    (this.refs.notificationsListBottomSheet as any).snapTo(1);
  };

  onSwitchToggle = (switchOn) => {
    this.setState({
      switchOn,
    });
  };

  processQRData = async (qrData) => {
    const { accounts, addTransferDetails, navigation } = this.props;

    const network = Bitcoin.networkType(qrData);
    if (network) {
      const serviceType =
        network === 'MAINNET' ? REGULAR_ACCOUNT : TEST_ACCOUNT; // default service type

      const service = accounts[serviceType].service;
      const { type } = service.addressDiff(qrData);
      if (type) {
        let item;
        switch (type) {
          case 'address':
            const recipientAddress = qrData;
            item = {
              id: recipientAddress,
            };

            addTransferDetails(serviceType, {
              selectedContact: item,
            });
            navigation.navigate('SendToContact', {
              selectedContact: item,
              serviceType,
            });
            break;

          case 'paymentURI':
            let address, options;
            try {
              const res = service.decodePaymentURI(qrData);
              address = res.address;
              options = res.options;
            } catch (err) {
              Alert.alert('Unable to decode payment URI');
              return;
            }

            item = {
              id: address,
            };

            addTransferDetails(serviceType, {
              selectedContact: item,
            });

            navigation.navigate('SendToContact', {
              selectedContact: item,
              serviceType,
              bitcoinAmount: options.amount
                ? `${Math.round(options.amount * 1e8)}`
                : '',
            });
            break;

          default:
            Toast('Invalid QR');
            break;
        }

        return;
      }
    }

    try {
      const scannedData = JSON.parse(qrData);
      if (scannedData.ver) {
        if (!(await isCompatible(scannedData.type, scannedData.ver))) return;
      }
      switch (scannedData.type) {
        case 'trustedGuardian':
          const trustedGruardianRequest = {
            isGuardian: scannedData.isGuardian,
            approvedTC: scannedData.approvedTC,
            requester: scannedData.requester,
            publicKey: scannedData.publicKey,
            info: scannedData.info,
            uploadedAt: scannedData.uploadedAt,
            type: scannedData.type,
            isQR: true,
            version: scannedData.ver,
          };
          this.setState(
            {
              loading: false,
              secondaryDeviceOtp: trustedGruardianRequest,
              trustedContactRequest: trustedGruardianRequest,
              recoveryRequest: null,
              isLoadContacts: true,
            },
            () => {
              setTimeout(() => {
                (this.refs.qrTabBarBottomSheet as any).snapTo(0);
              }, 2);

              if (this.state.tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                  deepLinkModalOpen: true,
                });
              }
              setTimeout(() => {
                (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
                (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
              }, 2);
            },
          );

          break;

        case 'secondaryDeviceGuardian':
          const secondaryDeviceGuardianRequest = {
            isGuardian: scannedData.isGuardian,
            requester: scannedData.requester,
            publicKey: scannedData.publicKey,
            info: scannedData.info,
            uploadedAt: scannedData.uploadedAt,
            type: scannedData.type,
            isQR: true,
            version: scannedData.ver,
          };

          this.setState(
            {
              loading: false,
              secondaryDeviceOtp: secondaryDeviceGuardianRequest,
              trustedContactRequest: secondaryDeviceGuardianRequest,
              recoveryRequest: null,
            },
            () => {
              // TODO -- figure out why its not closing with out timeout
              setTimeout(() => {
                (this.refs.qrTabBarBottomSheet as any).snapTo(0);
              }, 2);

              if (this.state.tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                  deepLinkModalOpen: true,
                });
              }
              setTimeout(() => {
                (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
                (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
              }, 2);
            },
          );

          break;

        case 'trustedContactQR':
          const tcRequest = {
            requester: scannedData.requester,
            publicKey: scannedData.publicKey,
            info: scannedData.info,
            type: scannedData.type,
            isQR: true,
            version: scannedData.ver,
          };

          this.setState(
            {
              loading: false,
              secondaryDeviceOtp: tcRequest,
              trustedContactRequest: tcRequest,
              recoveryRequest: null,
            },
            () => {
              // TODO -- figure out why its not closing with out timeout
              setTimeout(() => {
                (this.refs.qrTabBarBottomSheet as any).snapTo(0);
              }, 2);

              if (this.state.tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                  deepLinkModalOpen: true,
                });
              }
              setTimeout(() => {
                (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
                (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
              }, 2);
            },
          );

          break;

        case 'paymentTrustedContactQR':
          const paymentTCRequest = {
            isPaymentRequest: true,
            requester: scannedData.requester,
            publicKey: scannedData.publicKey,
            info: scannedData.info,
            type: scannedData.type,
            isQR: true,
            version: scannedData.ver,
          };

          this.setState(
            {
              loading: false,
              secondaryDeviceOtp: paymentTCRequest,
              trustedContactRequest: paymentTCRequest,
              recoveryRequest: null,
            },
            () => {
              // TODO -- figure out why its not closing with out timeout
              setTimeout(() => {
                (this.refs.qrTabBarBottomSheet as any).snapTo(0);
              }, 2);

              if (this.state.tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                  deepLinkModalOpen: true,
                });
              }
              setTimeout(() => {
                (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
                (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
              }, 2);
            },
          );

          break;

        case 'recoveryQR':
          const recoveryRequest = {
            isRecovery: true,
            requester: scannedData.requester,
            publicKey: scannedData.KEY,
            isQR: true,
          };
          this.setState(
            {
              loading: false,
              recoveryRequest: recoveryRequest,
              trustedContactRequest: null,
            },
            () => {
              setTimeout(() => {
                (this.refs.qrTabBarBottomSheet as any).snapTo(0);
              }, 2);

              if (this.state.tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                  deepLinkModalOpen: true,
                });
              }
              setTimeout(() => {
                (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
                (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
              }, 2);
            },
          );
          break;

        case 'ReverseRecoveryQR':
          Alert.alert(
            'Restoration QR Identified',
            'Restoration QR only works during restoration mode',
          );
          break;

        default:
          break;
      }
    } catch (err) {
      Toast('Invalid QR');
    }
  };

  setAccountCardData = (newCardData) => {
    let newArrayFinal = [];
    let tempArray = [];
    for (let a = 0; a < newCardData.length; a++) {
      tempArray.push(newCardData[a]);
      if (
        tempArray.length == 2 ||
        newCardData[newCardData.length - 1].id == tempArray[0].id
      ) {
        newArrayFinal.push(tempArray);
        tempArray = [];
      }
    }
    if (newArrayFinal) {
      this.setState({
        cardData: newArrayFinal,
      });
    }
  };

  updateAccountCardData = () => {
    let { accounts } = this.props;
    const defaultCardData = initialCardData;
    let idIndex = initialCardData[initialCardData.length - 1].id;

    const additionalCardData = [];
    for (const serviceType of [REGULAR_ACCOUNT, SECURE_ACCOUNT]) {
      const derivativeAccounts =
        accounts[serviceType].service[
          serviceType === SECURE_ACCOUNT ? 'secureHDWallet' : 'hdWallet'
        ].derivativeAccounts;

      if (!derivativeAccounts[DONATION_ACCOUNT]) continue;

      for (
        let index = 1;
        index <= derivativeAccounts[DONATION_ACCOUNT].instance.using;
        index++
      ) {
        const donAcc: DonationDerivativeAccountElements =
          derivativeAccounts[DONATION_ACCOUNT][index];
        idIndex++;
        const donationCardInstance = {
          id: idIndex,
          title: 'Donation Account',
          unit: 'sats',
          amount: donAcc.balances
            ? donAcc.balances.balance + donAcc.balances.unconfirmedBalance
            : 0,
          account: `Donate Bitcoin`,
          accountType: serviceType,
          bitcoinicon: require('../assets/images/icons/icon_bitcoin_test.png'),
        };
        additionalCardData.push(donationCardInstance);
      }
    }

    this.setAccountCardData([
      ...defaultCardData,
      ...additionalCardData,
      ...closingCardData,
    ]);
  };

  scheduleNotification = async () => {
    const channelId = new firebase.notifications.Android.Channel(
      'Default',
      'Default',
      firebase.notifications.Android.Importance.High,
    );
    firebase.notifications().android.createChannel(channelId);
    const notification = new firebase.notifications.Notification()
      .setTitle('We have not seen you in a while!')
      .setBody(
        'Opening your app regularly ensures you get all the notifications and security updates',
      )
      .setNotificationId('1')
      .setSound('default')
      .setData({
        title: 'We have not seen you in a while!',
        body:
          'Opening your app regularly ensures you get all the notifications and security updates',
      })
      .android.setChannelId('reminder')
      .android.setPriority(firebase.notifications.Android.Priority.High);

    // Schedule the notification for 2hours on development and 2 weeks on Production in the future
    const date = new Date();
    date.setHours(date.getHours() + Number(Config.NOTIFICATION_HOUR));

    // //console.log('DATE', date, Config.NOTIFICATION_HOUR, date.getTime());
    await firebase
      .notifications()
      .scheduleNotification(notification, {
        fireDate: date.getTime(),
        //repeatInterval: 'hour',
      })
      .then(() => {})
      .catch(
        (err) => {}, //console.log('err', err)
      );
    firebase
      .notifications()
      .getScheduledNotifications()
      .then((notifications) => {
        //console.log('logging notifications', notifications);
      });
  };

  onAppStateChange = async (nextAppState) => {
    const { appState } = this.state;
    try {
      if (appState === nextAppState) return;
      this.setState(
        {
          appState: nextAppState,
        },
        async () => {
          if (nextAppState === 'active') {
            this.scheduleNotification();
          }
          if (nextAppState === 'inactive' || nextAppState == 'background') {
            this.props.updatePreference({
              key: 'isInternetModalCome',
              value: false,
            });
            // TODO -- fix this part
            // await AsyncStorage.setItem(
            //   'isInternetModalCome',
            //   JSON.stringify(false),
            // );
          }
        },
      );
    } catch (error) {}
  };

  componentDidMount = () => {
    this.updateAccountCardData();
    this.getBalances();
    this.appStateListener = AppState.addEventListener(
      'change',
      this.onAppStateChange,
    );
    this.bootStrapNotifications();
    this.setUpFocusListener();
    this.getNewTransactionNotifications();
    Linking.addEventListener('url', this.handleDeepLink);
    setTimeout(() => {
      this.setState({
        transactionsLoading: false,
      });
    }, 1000);

    this.unsubscribe = NetInfo.addEventListener((state) => {
      setTimeout(() => {
        if (state.isInternetReachable === null) {
          return;
        }

        if (state.isInternetReachable) {
          (this.NoInternetBottomSheet as any).current.snapTo(0);
        } else {
          (this.NoInternetBottomSheet as any).current.snapTo(1);
        }
      }, 1000);
    });

    // health check

    const { s3Service, initHealthCheck } = this.props;
    const { healthCheckInitialized } = s3Service.sss;
    if (!healthCheckInitialized) {
      initHealthCheck();
    }

    // call this once deeplink is detected aswell
    this.handleDeeplinkModal();

    setTimeout(() => {
      this.setState(
        {
          isLoading: false,
        },
        () => this.props.updateLastSeen(new Date()),
      );
    }, 2);
  };

  getNewTransactionNotifications = async () => {
    const { notificationListNew } = this.props;
    let newTransactions = [];
    const { accounts, fetchDerivativeAccBalTx } = this.props;
    const regularAccount = accounts[REGULAR_ACCOUNT].service.hdWallet;
    const secureAccount = accounts[SECURE_ACCOUNT].service.secureHDWallet;

    let newTransactionsRegular =
      regularAccount.derivativeAccounts[FAST_BITCOINS][1] &&
      regularAccount.derivativeAccounts[FAST_BITCOINS][1].newTransactions;
    let newTransactionsSecure =
      secureAccount.derivativeAccounts[FAST_BITCOINS][1] &&
      secureAccount.derivativeAccounts[FAST_BITCOINS][1].newTransactions;

    if (newTransactionsRegular && newTransactionsRegular.length)
      newTransactions.push(...newTransactionsRegular);
    if (newTransactionsSecure && newTransactionsSecure.length)
      newTransactions.push(...newTransactionsSecure);

    if (newTransactions.length) {
      // let asyncNotification = notificationListNew;
      let asyncNotification = JSON.parse(
        await AsyncStorage.getItem('notificationList'),
      );
      let asyncNotificationList = [];
      if (asyncNotification.length) {
        asyncNotificationList = [];
        for (let i = 0; i < asyncNotification.length; i++) {
          asyncNotificationList.push(asyncNotification[i]);
        }
      }

      for (let i = 0; i < newTransactions.length; i++) {
        let present = false;
        for (const tx of asyncNotificationList) {
          if (
            tx.notificationsData &&
            newTransactions[i].txid === tx.notificationsData.txid
          )
            present = true;
        }
        if (present) continue;

        let obj = {
          type: 'contact',
          isMandatory: false,
          read: false,
          title: 'Alert from FastBitcoins',
          time: timeFormatter(moment(new Date()), moment(new Date()).valueOf()),
          date: new Date(),
          info: 'You have a new transaction',
          notificationId: createRandomString(17),
          notificationsData: newTransactions[i],
        };
        asyncNotificationList.push(obj);
        let notificationDetails = {
          id: obj.notificationId,
          title: obj.title,
          body: obj.info,
        };
        this.localNotification(notificationDetails);
      }
      //this.props.notificationsUpdated(asyncNotificationList);
      await AsyncStorage.setItem(
        'notificationList',
        JSON.stringify(asyncNotificationList),
      );
      asyncNotificationList.sort(function (left, right) {
        return moment.utc(right.date).unix() - moment.utc(left.date).unix();
      });
      setTimeout(() => {
        this.setState({
          notificationData: asyncNotificationList,
          notificationDataChange: !this.state.notificationDataChange,
        });
      }, 2);
    }
  };

  localNotification = async (notificationDetails) => {
    const notification = new firebase.notifications.Notification()
      .setTitle(notificationDetails.title)
      .setBody(notificationDetails.body)
      .setNotificationId(notificationDetails.id)
      .setSound('default')
      .setData({
        title: notificationDetails.title,
        body: notificationDetails.body,
      })
      .android.setChannelId('reminder')
      .android.setPriority(firebase.notifications.Android.Priority.High);
    // Schedule the notification for 2hours on development and 2 weeks on Production in the future
    const date = new Date();
    date.setSeconds(date.getSeconds() + 1);
    await firebase
      .notifications()
      .scheduleNotification(notification, {
        fireDate: date.getTime(),
      })
      .then(() => {})
      .catch((err) => {});
    firebase
      .notifications()
      .getScheduledNotifications()
      .then((notifications) => {});
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (
      prevProps.notificationList !== this.props.notificationList ||
      prevProps.releaseCasesValue !== this.props.releaseCasesValue
    ) {
      this.setupNotificationList();
    }

    if (prevProps.accounts !== this.props.accounts) {
      this.getBalances();
      this.getNewTransactionNotifications();
      this.updateAccountCardData();
    }

    if (prevProps.fcmTokenValue !== this.props.fcmTokenValue) {
      this.storeFCMToken();
    }

    if (
      prevProps.secondaryDeviceAddressValue !==
      this.props.secondaryDeviceAddressValue
    ) {
      this.setSecondaryDeviceAddresses();
    }

    if (this.props.paymentDetails !== null && this.props.paymentDetails) {
      const serviceType = REGULAR_ACCOUNT;
      const {
        paymentDetails,
        accounts,
        navigation,
        addTransferDetails,
        clearPaymentDetails,
      } = this.props;
      const { balances } = this.state;
      let { address, paymentURI } = paymentDetails;
      let options: any = {};
      if (paymentURI) {
        try {
          const details = accounts[serviceType].service.decodePaymentURI(
            paymentURI,
          );
          address = details.address;
          options = details.options;
        } catch (err) {
          Alert.alert('Unable to decode payment URI');
          return;
        }
      }

      const item = {
        id: address,
      };

      addTransferDetails(serviceType, {
        selectedContact: item,
      });

      clearPaymentDetails();

      navigation.navigate('SendToContact', {
        selectedContact: item,
        serviceType,
        bitcoinAmount: options.amount
          ? `${Math.round(options.amount * 1e8)}`
          : '',
      });
    }

    if (prevState.isLoading && !this.state.isLoading) {
      if (this.refs.transactionTabBarBottomSheet) {
        (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
      }
    }
  };

  handleDeeplinkModal = () => {
    const custodyRequest = this.props.navigation.getParam('custodyRequest');
    const recoveryRequest = this.props.navigation.getParam('recoveryRequest');
    const trustedContactRequest = this.props.navigation.getParam(
      'trustedContactRequest',
    );
    const userKey = this.props.navigation.getParam('userKey');

    if (custodyRequest) {
      this.setState(
        {
          custodyRequest,
        },
        () => {
          if (this.state.tabBarIndex === 999) {
            this.setState({
              tabBarIndex: 0,
              deepLinkModalOpen: true,
            });
          }

          setTimeout(() => {
            if (this.refs.allAccountsBottomSheet) {
              (this.refs.allAccountsBottomSheet as any).snapTo(0);
              (this.refs.settingsBottomSheet as any).snapTo(0);
            }

            (this.refs.custodianRequestBottomSheet as any).snapTo(1);
            (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
          }, 2);
        },
      );
      return;
    }

    if (recoveryRequest || trustedContactRequest) {
      this.setState(
        {
          recoveryRequest,
          trustedContactRequest,
        },
        () => {
          if (this.state.tabBarIndex === 999) {
            this.setState({
              tabBarIndex: 0,
              deepLinkModalOpen: true,
            });
          }
          setTimeout(() => {
            (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
            (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
          }, 2);
        },
      );

      return;
    }

    if (userKey) {
      this.props.navigation.navigate('PairNewWallet', { userKey });
      return;
    }

    return;
  };

  componentWillUnmount() {
    if (this.focusListener) {
      this.focusListener();
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    // if (this.appStateListener) {
    //   this.appStateListener();
    // }
    if (this.firebaseNotificationListener) {
      this.firebaseNotificationListener();
    }
    if (this.notificationOpenedListener) {
      this.notificationOpenedListener();
    }
  }

  handleDeepLink = async (event) => {
    const { navigation, isFocused } = this.props;
    // if user is in any other screen before opening
    // deep link , we will navigate user to home first
    if (!isFocused) {
      navigation.navigate('Home');
    }
    const splits = event.url.split('/');

    if (splits[5] === 'sss') {
      const requester = splits[4];
      if (splits[6] === 'ek') {
        const custodyRequest = {
          requester,
          ek: splits[7],
          uploadedAt: splits[8],
        };
        this.setState(
          {
            custodyRequest,
          },
          () => {
            if (this.state.tabBarIndex === 999) {
              this.setState({
                tabBarIndex: 0,
                deepLinkModalOpen: true,
              });
            }
            setTimeout(() => {
              (this.refs.allAccountsBottomSheet as any)
                .snapTo(0)(this.refs.settingsBottomSheet as any)
                .snapTo(0)(this.refs.custodianRequestBottomSheet as any)
                .snapTo(1)(this.refs.transactionTabBarBottomSheet as any)
                .snapTo(1);
            }, 2);
          },
        );
        // navigation.navigate('Home', { custodyRequest });
      } else if (splits[6] === 'rk') {
        const recoveryRequest = { requester, rk: splits[7] };
        this.setState(
          {
            recoveryRequest,
            trustedContactRequest: null,
          },
          () => {
            if (this.state.tabBarIndex === 999) {
              this.setState({
                tabBarIndex: 0,
                deepLinkModalOpen: true,
              });
            }
            setTimeout(() => {
              (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
              (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
            }, 2);
          },
        );
      }
    } else if (['tc', 'tcg', 'atcg', 'ptc'].includes(splits[4])) {
      if (splits[3] !== config.APP_STAGE) {
        Alert.alert(
          'Invalid deeplink',
          `Following deeplink could not be processed by Hexa:${config.APP_STAGE.toUpperCase()}, use Hexa:${
            splits[3]
          }`,
        );
      } else {
        const version = splits.pop().slice(1);
        if (version) {
          if (!(await isCompatible(splits[4], version))) return;
        }

        const trustedContactRequest = {
          isGuardian: ['tcg', 'atcg'].includes(splits[4]),
          approvedTC: splits[4] === 'atcg' ? true : false,
          isPaymentRequest: splits[4] === 'ptc' ? true : false,
          requester: splits[5],
          encryptedKey: splits[6],
          hintType: splits[7],
          hint: splits[8],
          uploadedAt: splits[9],
          version,
        };

        this.setState(
          {
            trustedContactRequest,
            recoveryRequest: null,
          },
          () => {
            if (this.state.tabBarIndex === 999) {
              this.setState({
                tabBarIndex: 0,
                deepLinkModalOpen: true,
              });
            }
            setTimeout(() => {
              (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
              (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
            }, 2);
          },
        );
      }
    } else if (splits[4] === 'rk') {
      const recoveryRequest = {
        isRecovery: true,
        requester: splits[5],
        encryptedKey: splits[6],
        hintType: splits[7],
        hint: splits[8],
      };
      this.setState(
        {
          recoveryRequest,
          trustedContactRequest: null,
        },
        () => {
          if (this.state.tabBarIndex === 999) {
            this.setState({
              tabBarIndex: 0,
              deepLinkModalOpen: true,
            });
          }
          setTimeout(() => {
            (this.refs.trustedContactRequestBottomSheet as any).snapTo(1);
            (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
          }, 2);
        },
      );
    } else if (splits[4] === 'rrk') {
      Alert.alert(
        'Restoration link Identified',
        'Restoration links only works during restoration mode',
      );
    }

    if (event.url.includes('fastbitcoins')) {
      const userKey = event.url.substr(event.url.lastIndexOf('/') + 1);
      navigation.navigate('PairNewWallet', { userKey });
    }
  };

  setUpFocusListener = () => {
    const { navigation } = this.props;
    this.focusListener = navigation.addListener('didFocus', () => {
      this.setCurrencyCodeFromAsync();
      this.getAssociatedContact();
      this.checkFastBitcoin();
      this.props.fetchNotifications();
      this.setState({
        lastActiveTime: moment().toISOString(),
      });
    });

    setTimeout(() => {
      if (this.refs.transactionTabBarBottomSheet) {
        (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
      }

      if (this.refs.addTabBarBottomSheet) {
        (this.refs.addTabBarBottomSheet as any).snapTo(0);
      }

      if (this.refs.qrTabBarBottomSheet) {
        (this.refs.qrTabBarBottomSheet as any).snapTo(0);
      }

      if (this.refs.moreTabBarBottomSheet) {
        (this.refs.moreTabBarBottomSheet as any).snapTo(0);
      }
    }, 500);

    this.getAssociatedContact();
    this.setCurrencyCodeFromAsync();
    this.checkFastBitcoin();
  };

  checkFastBitcoin = async () => {
    const { FBTCAccountData } = this.props;
    let getFBTCAccount = FBTCAccountData || {};
    // JSON.parse(await AsyncStorage.getItem('FBTCAccount')) || {};
    this.setState({ fbBTCAccount: getFBTCAccount });
    return;
  };

  setSecondaryDeviceAddresses = async () => {
    let secondaryDeviceOtpTemp = this.props.secondaryDeviceAddressValue;
    // JSON.parse(
    //   await AsyncStorage.getItem('secondaryDeviceAddress'),
    // );
    if (!secondaryDeviceOtpTemp) {
      secondaryDeviceOtpTemp = [];
    }
    if (
      secondaryDeviceOtpTemp.findIndex(
        (value) => value.otp == (this.state.secondaryDeviceOtp as any).otp,
      ) == -1
    ) {
      secondaryDeviceOtpTemp.push(this.state.secondaryDeviceOtp);
      this.props.setSecondaryDeviceAddress(secondaryDeviceOtpTemp);
      // await AsyncStorage.setItem(
      //   'secondaryDeviceAddress',
      //   JSON.stringify(secondaryDeviceOtpTemp),
      // );
    }
  };

  getAssociatedContact = async () => {
    // TODO -- need to check this
    let AssociatedContact = JSON.parse(
      await AsyncStorage.getItem('AssociatedContacts'),
    );
    // setAssociatedContact(AssociatedContact);
    this.setSecondaryDeviceAddresses();
  };

  setCurrencyCodeFromAsync = async () => {
    const { currencyCode, currencyToggleValue } = this.props;
    let currencyCodeTmp = currencyCode;
    if (!currencyCodeTmp) {
      currencyCodeTmp = await AsyncStorage.getItem('currencyCode');
    }
    if (!currencyCodeTmp) {
      this.props.setCurrencyCode(RNLocalize.getCurrencies()[0]);
      //await AsyncStorage.setItem('currencyCode', RNLocalize.getCurrencies()[0]);
      this.setState({
        currencyCode: RNLocalize.getCurrencies()[0],
      });
    } else {
      this.setState({
        currencyCode: currencyCodeTmp,
      });
    }
    let currencyToggleValueTmp = currencyToggleValue;
    if (!currencyToggleValueTmp) {
      currencyToggleValueTmp = await AsyncStorage.getItem(
        'currencyToggleValue',
      );
    }
    this.setState({
      switchOn: currencyToggleValueTmp ? true : false,
    });
  };

  bootStrapNotifications = async () => {
    const enabled = await firebase.messaging().hasPermission();
    if (!enabled) {
      await firebase
        .messaging()
        .requestPermission()
        .then(() => {
          // User has authorized
          this.createNotificationListeners();
          this.storeFCMToken();
          this.scheduleNotification();
        })
        .catch((error) => {
          // User has rejected permissions
          //console.log(
          // 'PERMISSION REQUEST :: notification permission rejected',
          //  error,
          //);
        });
    } else {
      this.createNotificationListeners();
      this.storeFCMToken();
      this.scheduleNotification();
    }
  };

  storeFCMToken = async () => {
    const fcmToken = await firebase.messaging().getToken();
    let fcmArray = [fcmToken];
    let fcmTokenFromAsync = this.props.fcmTokenValue;
    if (fcmTokenFromAsync && fcmTokenFromAsync != fcmToken) {
      this.props.setFCMToken(fcmToken);
      //TODO: Remove setItem
      await AsyncStorage.setItem('fcmToken', fcmToken);
      this.props.updateFCMTokens(fcmArray);
    } else if (!fcmTokenFromAsync) {
      this.props.setFCMToken(fcmToken);
      //TODO: Remove setItem
      await AsyncStorage.setItem('fcmToken', fcmToken);
      this.props.updateFCMTokens(fcmArray);
    }
  };

  onNotificationArrives = async (notification) => {
    this.props.fetchNotifications();
    const { title, body } = notification;
    const deviceTrayNotification = new firebase.notifications.Notification()
      .setTitle(title)
      .setBody(body)
      .setNotificationId(notification.notificationId)
      .setSound('default')
      .android.setPriority(firebase.notifications.Android.Priority.High)
      .android.setChannelId(
        notification.android.channelId
          ? notification.android.channelId
          : 'foregroundNotification',
      ) // previously created
      .android.setAutoCancel(true); // To remove notification when tapped on it

    const channelId = new firebase.notifications.Android.Channel(
      notification.android.channelId,
      notification.android.channelId ? 'Reminder' : 'ForegroundNotification',
      firebase.notifications.Android.Importance.High,
    );
    firebase.notifications().android.createChannel(channelId);
    firebase.notifications().displayNotification(deviceTrayNotification);
  };

  createNotificationListeners = async () => {
    /*
     * Triggered when a particular notification has been received in foreground
     * */
    this.firebaseNotificationListener = firebase
      .notifications()
      .onNotification((notification) => {
        this.onNotificationArrives(notification);
      });

    /*
     * If your app is in background, you can listen for when a notification is clicked / tapped / opened as follows:
     * */
    this.notificationOpenedListener = firebase
      .notifications()
      .onNotificationOpened(async (notificationOpen) => {
        const { title, body } = notificationOpen.notification;
        this.props.fetchNotifications();
        this.onNotificationOpen(notificationOpen.notification);
      });

    /*
     * If your app is closed, you can check if it was opened by a notification being clicked / tapped / opened as follows:
     * */
    const notificationOpen = await firebase
      .notifications()
      .getInitialNotification();
    if (notificationOpen) {
      const { title, body } = notificationOpen.notification;

      this.props.fetchNotifications();
      this.onNotificationOpen(notificationOpen.notification);
    }
    /*
     * Triggered for data only payload in foreground
     * */
    firebase.messaging().onMessage((message) => {
      //process data message
    });
  };

  onNotificationOpen = async (item) => {
    let content = JSON.parse(item._data.content);
    const { notificationListNew } = this.props;
    // let asyncNotificationList = notificationListNew;
    let asyncNotificationList = JSON.parse(
      await AsyncStorage.getItem('notificationList'),
    );
    if (!asyncNotificationList) {
      asyncNotificationList = [];
    }
    let readStatus = true;
    if (content.notificationType == 'release') {
      let releaseCases = this.props.releaseCasesValue;
      //JSON.parse(await AsyncStorage.getItem('releaseCases'));
      if (releaseCases.ignoreClick) {
        readStatus = true;
      } else if (releaseCases.remindMeLaterClick) {
        readStatus = false;
      } else {
        readStatus = false;
      }
    }
    let obj = {
      type: content.notificationType,
      isMandatory: false,
      read: readStatus,
      title: item.title,
      time: timeFormatter(moment(new Date()), moment(new Date()).valueOf()),
      date: new Date(),
      info: item.body,
      notificationId: content.notificationId,
    };
    asyncNotificationList.push(obj);
    // this.props.notificationsUpdated(asyncNotificationList);

    await AsyncStorage.setItem(
      'notificationList',
      JSON.stringify(asyncNotificationList),
    );
    asyncNotificationList.sort(function (left, right) {
      return moment.utc(right.date).unix() - moment.utc(left.date).unix();
    });
    this.setState({
      notificationData: asyncNotificationList,
      notificationDataChange: !this.state.notificationDataChange,
    });
    this.onPressNotifications();
  };

  getBalances = () => {
    const { accounts } = this.props;

    let testBalance = accounts[TEST_ACCOUNT].service
      ? accounts[TEST_ACCOUNT].service.hdWallet.balances.balance +
        accounts[TEST_ACCOUNT].service.hdWallet.balances.unconfirmedBalance
      : 0;

    const testTransactions = accounts[TEST_ACCOUNT].service
      ? accounts[TEST_ACCOUNT].service.hdWallet.transactions.transactionDetails
      : [];

    if (!testTransactions.length) testBalance = 10000; // hardcoding t-balance (till t-faucet saga syncs)

    let regularBalance = accounts[REGULAR_ACCOUNT].service
      ? accounts[REGULAR_ACCOUNT].service.hdWallet.balances.balance +
        accounts[REGULAR_ACCOUNT].service.hdWallet.balances.unconfirmedBalance
      : 0;

    let regularTransactions = accounts[REGULAR_ACCOUNT].service
      ? accounts[REGULAR_ACCOUNT].service.hdWallet.transactions
          .transactionDetails
      : [];

    // regular derivative accounts
    for (const dAccountType of config.DERIVATIVE_ACC_TO_SYNC) {
      const derivativeAccount =
        accounts[REGULAR_ACCOUNT].service.hdWallet.derivativeAccounts[
          dAccountType
        ];
      if (derivativeAccount && derivativeAccount.instance.using) {
        for (
          let accountNumber = 1;
          accountNumber <= derivativeAccount.instance.using;
          accountNumber++
        ) {
          // console.log({
          //   accountNumber,
          //   balances: trustedAccounts[accountNumber].balances,
          //   transactions: trustedAccounts[accountNumber].transactions,
          // });
          if (derivativeAccount[accountNumber].balances) {
            regularBalance +=
              derivativeAccount[accountNumber].balances.balance +
              derivativeAccount[accountNumber].balances.unconfirmedBalance;
          }

          if (derivativeAccount[accountNumber].transactions) {
            derivativeAccount[
              accountNumber
            ].transactions.transactionDetails.forEach((tx) => {
              let include = true;
              for (const currentTx of regularTransactions) {
                if (tx.txid === currentTx.txid) {
                  include = false;
                  break;
                }
              }
              if (include) regularTransactions.push(tx);
            });
          }
        }
      }
    }

    let secureBalance = accounts[SECURE_ACCOUNT].service
      ? accounts[SECURE_ACCOUNT].service.secureHDWallet.balances.balance +
        accounts[SECURE_ACCOUNT].service.secureHDWallet.balances
          .unconfirmedBalance
      : 0;

    const secureTransactions = accounts[SECURE_ACCOUNT].service
      ? accounts[SECURE_ACCOUNT].service.secureHDWallet.transactions
          .transactionDetails
      : [];

    // secure derivative accounts
    for (const dAccountType of config.DERIVATIVE_ACC_TO_SYNC) {
      if (dAccountType === TRUSTED_CONTACTS) continue;

      const derivativeAccount =
        accounts[SECURE_ACCOUNT].service.secureHDWallet.derivativeAccounts[
          dAccountType
        ];
      if (derivativeAccount && derivativeAccount.instance.using) {
        for (
          let accountNumber = 1;
          accountNumber <= derivativeAccount.instance.using;
          accountNumber++
        ) {
          // console.log({
          //   accountNumber,
          //   balances: trustedAccounts[accountNumber].balances,
          //   transactions: trustedAccounts[accountNumber].transactions,
          // });
          if (derivativeAccount[accountNumber].balances) {
            secureBalance +=
              derivativeAccount[accountNumber].balances.balance +
              derivativeAccount[accountNumber].balances.unconfirmedBalance;
          }

          if (derivativeAccount[accountNumber].transactions) {
            derivativeAccount[
              accountNumber
            ].transactions.transactionDetails.forEach((tx) => {
              let include = true;
              for (const currentTx of secureTransactions) {
                if (tx.txid === currentTx.txid) {
                  include = false;
                  break;
                }
              }
              if (include) secureTransactions.push(tx);
            });
          }
        }
      }
    }

    // donation transactions
    const donationTxs = [];
    let donationsBalance = 0;
    for (const serviceType of [REGULAR_ACCOUNT, SECURE_ACCOUNT]) {
      const derivativeAccounts =
        accounts[serviceType].service[
          serviceType === SECURE_ACCOUNT ? 'secureHDWallet' : 'hdWallet'
        ].derivativeAccounts;

      if (!derivativeAccounts[DONATION_ACCOUNT]) continue;

      for (
        let index = 1;
        index <= derivativeAccounts[DONATION_ACCOUNT].instance.using;
        index++
      ) {
        const donAcc: DonationDerivativeAccountElements =
          derivativeAccounts[DONATION_ACCOUNT][index];

        if (donAcc.balances)
          donationsBalance +=
            donAcc.balances.balance + donAcc.balances.unconfirmedBalance;
        if (
          donAcc.transactions &&
          donAcc.transactions.transactionDetails.length
        )
          donationTxs.push(...donAcc.transactions.transactionDetails);
      }
    }

    const accumulativeBalance =
      regularBalance + secureBalance + donationsBalance;

    const accumulativeTransactions = [
      ...testTransactions,
      ...regularTransactions,
      ...secureTransactions,
      ...donationTxs,
    ];
    if (accumulativeTransactions.length) {
      accumulativeTransactions.sort(function (left, right) {
        return moment.utc(right.date).unix() - moment.utc(left.date).unix();
      });
    }

    this.setState({
      balances: {
        testBalance,
        regularBalance,
        secureBalance,
        accumulativeBalance,
      },
      transactions: accumulativeTransactions,
      isBalanceLoading: false,
    });

    // if (balancesParam) {
    //   if (
    //     JSON.stringify(balancesParam) !==
    //     JSON.stringify({
    //       testBalance,
    //       regularBalance,
    //       secureBalance,
    //       accumulativeBalance,
    //     })
    //   ) {
    //     setBalances({
    //       testBalance,
    //       regularBalance,
    //       secureBalance,
    //       accumulativeBalance,
    //     });
    //     setTransactions(accumulativeTransactions);
    //   }
    // } else {
    //   setBalances({
    //     testBalance,
    //     regularBalance,
    //     secureBalance,
    //     accumulativeBalance,
    //   });
    //   setTransactions(accumulativeTransactions);
    // }
  };

  onPressSettingsElements = async (type, currencycode) => {
    const { navigation, currencyCode } = this.props;
    if (type == 'ManagePin') {
      return navigation.navigate('SettingManagePin', {
        managePinSuccessProceed: (pin) => this.managePinSuccessProceed(pin),
      });
    } else if (type == 'ChangeCurrency') {
      let currency = currencyCode;
      //await AsyncStorage.getItem('currencyCode');
      navigation.navigate('ChangeCurrency');
      this.setState({
        currencyCode: currency,
      });
    } else if (type == 'ChangeWalletName') {
      navigation.navigate('SettingWalletNameChange');
    }
  };

  managePinSuccessProceed = (pin) => {
    this.setState(
      {
        tabBarIndex: 999,
      },
      () => {
        (this.refs.settingsBottomSheet as any).snapTo(0);
      },
    );
  };

  onNotificationListOpen = async () => {
    const { notificationListNew } = this.props;
    // let asyncNotificationList = notificationListNew;
    let asyncNotificationList = JSON.parse(
      await AsyncStorage.getItem('notificationList'),
    );
    if (asyncNotificationList) {
      for (let i = 0; i < asyncNotificationList.length; i++) {
        if (asyncNotificationList[i]) {
          asyncNotificationList[i].time = timeFormatter(
            moment(new Date()),
            moment(asyncNotificationList[i].date).valueOf(),
          );
        }
      }
      // this.props.notificationsUpdated(asyncNotificationList);

      await AsyncStorage.setItem(
        'notificationList',
        JSON.stringify(asyncNotificationList),
      );
      asyncNotificationList.sort(function (left, right) {
        return moment.utc(right.date).unix() - moment.utc(left.date).unix();
      });

      this.setState({
        notificationData: asyncNotificationList,
        notificationDataChange: !this.state.notificationDataChange,
      });
    }
  };

  onPressSaveBitcoinElements = (type) => {
    const { navigation } = this.props;
    if (type == 'voucher') {
      navigation.navigate('VoucherScanner');
    } else if (type == 'existingBuyingMethods') {
      navigation.navigate('ExistingSavingMethods');
    }
  };

  onTrustedContactRequestAccept = (key) => {
    this.setState({
      tabBarIndex: 999,
      deepLinkModalOpen: false,
    });
    setTimeout(() => {
      (this.refs.trustedContactRequestBottomSheet as any).snapTo(0);
    }, 1);
    this.processDLRequest(key, false);
  };

  onTrustedContactReject = (key) => {
    setTimeout(() => {
      this.setState({
        tabBarIndex: 999,
        deepLinkModalOpen: false,
      });
    }, 2);
    (this.refs.trustedContactRequestBottomSheet as any).snapTo(0);
    // this.processDLRequest(key, true);
  };

  onPhoneNumberChange = () => {};

  selectTab = (tabTitle) => {
    if (tabTitle == 'More') {
      this.setState(
        {
          knowMoreBottomSheetsFlag: true,
          selectedBottomTab: tabTitle,
        },
        () => {
          (this.refs.transactionTabBarBottomSheet as any).snapTo(0);
          (this.refs.addTabBarBottomSheet as any).snapTo(0);
          (this.refs.qrTabBarBottomSheet as any).snapTo(0);
          (this.refs.moreTabBarBottomSheet as any).snapTo(2);
        },
      );
      return;
    }
    if (tabTitle == 'Transactions') {
      this.setState(
        {
          modalData: initialTransactionData,
          selectedBottomTab: tabTitle,
        },
        () => {
          (this.refs.transactionTabBarBottomSheet as any).snapTo(2);
          (this.refs.addTabBarBottomSheet as any).snapTo(0);
          (this.refs.qrTabBarBottomSheet as any).snapTo(0);
          (this.refs.moreTabBarBottomSheet as any).snapTo(0);
        },
      );
      return;
    }
    if (tabTitle == 'Add') {
      this.setState(
        {
          modalData: [],
          selectedBottomTab: tabTitle,
        },
        () => {
          (this.refs.transactionTabBarBottomSheet as any).snapTo(0);
          (this.refs.addTabBarBottomSheet as any).snapTo(2);
          (this.refs.qrTabBarBottomSheet as any).snapTo(0);
          (this.refs.moreTabBarBottomSheet as any).snapTo(0);
        },
      );
      return;
    }
    if (tabTitle == 'QR') {
      this.setState(
        {
          modalData: initialTransactionData,
          selectedBottomTab: tabTitle,
        },
        () => {
          (this.refs.transactionTabBarBottomSheet as any).snapTo(0);
          (this.refs.addTabBarBottomSheet as any).snapTo(0);
          (this.refs.qrTabBarBottomSheet as any).snapTo(2);
          (this.refs.moreTabBarBottomSheet as any).snapTo(0);
        },
      );
      return;
    }
  };

  processDLRequest = (key, rejected) => {
    const { trustedContactRequest, recoveryRequest } = this.state;
    let {
      requester,
      isGuardian,
      approvedTC,
      encryptedKey,
      publicKey,
      info,
      isQR,
      uploadedAt,
      isRecovery,
      version,
    } = trustedContactRequest || recoveryRequest;
    const {
      UNDER_CUSTODY,
      uploadRequestedShare,
      navigation,
      approveTrustedContact,
      fetchEphemeralChannel,
      fetchTrustedChannel,
      walletName,
      trustedContacts,
    } = this.props;

    if (!isRecovery) {
      if (requester === walletName) {
        Toast('Cannot be your own Contact/Guardian');
        return;
      }

      let expiry = config.TC_REQUEST_EXPIRY;
      if (!semver.valid(version)) {
        // expiry support for 0.7, 0.9 and 1.0
        expiry = config.LEGACY_TC_REQUEST_EXPIRY;
      }

      if (uploadedAt && Date.now() - uploadedAt > expiry) {
        Alert.alert(
          `${isQR ? 'QR' : 'Link'} expired!`,
          `Please ask the sender to initiate a new ${isQR ? 'QR' : 'Link'}`,
        );
        this.setState({
          loading: false,
        });
      } else {
        if (isGuardian && UNDER_CUSTODY[requester]) {
          Alert.alert(
            'Failed to accept',
            `You already custody a share against the wallet name: ${requester}`,
          );
          this.setState({
            loading: false,
          });
        } else {
          if (!publicKey) {
            try {
              publicKey = TrustedContactsService.decryptPub(encryptedKey, key)
                .decryptedPub;
              info = key;
            } catch (err) {
              Alert.alert(
                'Invalid Number/Email',
                'Decryption failed due to invalid input, try again.',
              );
              return;
            }
          }

          let existingContact, existingContactName;
          Object.keys(trustedContacts.tc.trustedContacts).forEach(
            (contactName) => {
              const contact = trustedContacts.tc.trustedContacts[contactName];
              if (contact.contactsPubKey === publicKey) {
                existingContactName = contactName;
                existingContact = contact;
              }
            },
          );
          if (existingContactName && !approvedTC) {
            Toast('Contact already exists against this request');
            return;
          }

          if (publicKey && !rejected) {
            if (!approvedTC) {
              navigation.navigate('ContactsListForAssociateContact', {
                postAssociation: (contact) => {
                  let contactName = '';
                  if (contact) {
                    contactName = `${contact.firstName} ${
                      contact.lastName ? contact.lastName : ''
                    }`.toLowerCase();
                  } else {
                    contactName = `${requester}'s Wallet`.toLowerCase();
                  }
                  if (!semver.valid(version)) {
                    // for 0.7, 0.9 and 1.0: info remains null
                    info = null;
                  }

                  const contactInfo = {
                    contactName,
                    info,
                  };

                  approveTrustedContact(
                    contactInfo,
                    publicKey,
                    true,
                    requester,
                    isGuardian,
                  );
                },
                isGuardian,
              });
            } else {
              if (!existingContactName) {
                Alert.alert(
                  'Invalid Link/QR',
                  'You are not a valid trusted contact for approving this request',
                );
                return;
              }
              const contactInfo = {
                contactName: existingContactName,
                info,
              };

              fetchTrustedChannel(
                contactInfo,
                trustedChannelActions.downloadShare,
                requester,
              );
            }
          } else if (publicKey && rejected) {
            // don't associate; only fetch the payment details from EC
            // fetchEphemeralChannel(null, null, publicKey);
          }
        }
      }
    } else {
      if (requester === walletName) {
        Toast('You do not host any key of your own');
        return;
      }

      if (!UNDER_CUSTODY[requester]) {
        this.setState(
          {
            loading: false,
            errorMessageHeader: `You do not custody a share with the wallet name ${requester}`,
            errorMessage: `Request your contact to send the request again with the correct wallet name or help them manually restore by going into Friends and Family > I am the Keeper of > Help Restore`,
            buttonText: 'Okay',
          },
          () => {
            (this.refs.errorBottomSheet as any).snapTo(1);
          },
        );
      } else {
        if (!publicKey) {
          try {
            publicKey = TrustedContactsService.decryptPub(encryptedKey, key)
              .decryptedPub;
          } catch (err) {
            Alert.alert(
              'Invalid Number/Email',
              'Decryption failed due to invalid input, try again.',
            );
          }
        }
        if (publicKey) {
          uploadRequestedShare(recoveryRequest.requester, publicKey);
        }
      }
    }
  };

  openCloseModal = () => {
    const { openModal, selectedBottomTab } = this.state;
    if (openModal === 'closed') {
      this.setState(
        {
          openModal: 'half',
        },
        () => {
          if (selectedBottomTab === 'Transactions') {
            (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
          }
        },
      );
    }
    if (openModal === 'half') {
      this.setState(
        {
          openModal: 'full',
        },
        () => {
          if (selectedBottomTab === 'Transactions') {
            (this.refs.transactionTabBarBottomSheet as any).snapTo(2);
          }
        },
      );
    }
    if (openModal === 'full') {
      this.setState(
        {
          openModal: 'closed',
        },
        () => {
          if (selectedBottomTab === 'Transactions') {
            (this.refs.transactionTabBarBottomSheet as any).snapTo(0);
          }
        },
      );
    }
  };

  onNotificationClicked = async (value) => {
    const { notificationListNew } = this.props;
    //let asyncNotifications = notificationListNew;
    let asyncNotifications = JSON.parse(
      await AsyncStorage.getItem('notificationList'),
    );
    const { notificationData } = this.state;
    const { navigation } = this.props;
    let tempNotificationData = notificationData;
    for (let i = 0; i < tempNotificationData.length; i++) {
      const element = tempNotificationData[i];
      if (element.notificationId == value.notificationId) {
        if (
          asyncNotifications &&
          asyncNotifications.length &&
          asyncNotifications.findIndex(
            (item) => item.notificationId == value.notificationId,
          ) > -1
        ) {
          asyncNotifications[
            asyncNotifications.findIndex(
              (item) => item.notificationId == value.notificationId,
            )
          ].read = true;
        }
        tempNotificationData[i].read = true;
      }
    }
    // this.props.notificationsUpdated(asyncNotifications);
    await AsyncStorage.setItem(
      'notificationList',
      JSON.stringify(asyncNotifications),
    );

    this.setState({
      notificationData: tempNotificationData,
      notificationDataChange: !this.state.notificationDataChange,
    });

    if (value.info.includes('Trusted Contact request accepted by')) {
      navigation.navigate('AddressBookContents');
      return;
    }

    if (value.type == 'release') {
      RelayServices.fetchReleases(value.info.split(' ')[1])
        .then(async (res) => {
          if (res.data.releases.length) {
            let releaseNotes = res.data.releases.length
              ? res.data.releases.find((el) => {
                  return el.build === value.info.split(' ')[1];
                })
              : '';
            navigation.navigate('UpdateApp', {
              releaseData: [releaseNotes],
              isOpenFromNotificationList: true,
              releaseNumber: value.info.split(' ')[1],
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
    if (value.type == 'contact') {
      setTimeout(() => {
        (this.refs.notificationsListBottomSheet as any).snapTo(0);
      }, 2);
      this.selectTab('Transactions');
    }
  };

  onPressElement = (item) => {
    const { navigation } = this.props;
    if (item.title == 'Backup Health') {
      navigation.navigate('ManageBackup');
      return;
    }
    if (item.title == 'Friends and Family') {
      navigation.navigate('AddressBookContents');
      return;
    } else if (item.title == 'Wallet Settings') {
      (this.refs.settingsBottomSheet as any).snapTo(1);
      setTimeout(() => {
        this.setState({
          tabBarIndex: 0,
        });
      }, 10);
    } else if (item.title == 'Funding Sources') {
      navigation.navigate('ExistingSavingMethods');
    } else if (item.title === 'Hexa Community (Telegram)') {
      let url = 'https://t.me/HexaWallet';
      Linking.openURL(url)
        .then((data) => {})
        .catch((e) => {
          alert('Make sure Telegram installed on your device');
        });
      return;
    }
  };

  setupNotificationList = async () => {
    const { notificationListNew } = this.props;
    // let asyncNotification = notificationListNew;
    let asyncNotification = JSON.parse(
      await AsyncStorage.getItem('notificationList'),
    );
    let asyncNotificationList = [];
    if (asyncNotification) {
      asyncNotificationList = [];
      for (let i = 0; i < asyncNotification.length; i++) {
        asyncNotificationList.push(asyncNotification[i]);
      }
    }
    let tmpList = asyncNotificationList;
    const { notificationList } = this.props;
    if (notificationList) {
      for (let i = 0; i < notificationList['notifications'].length; i++) {
        const element = notificationList['notifications'][i];
        let readStatus = false;
        if (element.notificationType == 'release') {
          let releaseCases = this.props.releaseCasesValue;
          // JSON.parse(
          //   await AsyncStorage.getItem('releaseCases'),
          // );
          if (element.body.split(' ')[1] == releaseCases.build) {
            if (releaseCases.remindMeLaterClick) {
              readStatus = false;
            }
            if (releaseCases.ignoreClick) {
              readStatus = true;
            }
          } else {
            readStatus = true;
          }
        }
        if (
          asyncNotificationList.findIndex(
            (value) => value.notificationId == element.notificationId,
          ) > -1
        ) {
          let temp =
            asyncNotificationList[
              asyncNotificationList.findIndex(
                (value) => value.notificationId == element.notificationId,
              )
            ];
          if (element.notificationType == 'release') {
            readStatus = readStatus;
          } else {
            readStatus = temp.read;
          }
          let obj = {
            ...temp,
            read: readStatus,
            type: element.notificationType,
            title: element.title,
            info: element.body,
            isMandatory: element.tag == 'mandatory' ? true : false,
            time: timeFormatter(
              moment(new Date()),
              moment(element.date).valueOf(),
            ),
            date: new Date(element.date),
          };
          tmpList[
            tmpList.findIndex(
              (value) => value.notificationId == element.notificationId,
            )
          ] = obj;
        } else {
          let obj = {
            type: element.notificationType,
            isMandatory: element.tag == 'mandatory' ? true : false,
            read: readStatus,
            title: element.title,
            time: timeFormatter(
              moment(new Date()),
              moment(element.date).valueOf(),
            ),
            date: new Date(element.date),
            info: element.body,
            notificationId: element.notificationId,
          };
          tmpList.push(obj);
        }
      }
      //this.props.notificationsUpdated(tmpList);
      await AsyncStorage.setItem('notificationList', JSON.stringify(tmpList));
      tmpList.sort(function (left, right) {
        return moment.utc(right.date).unix() - moment.utc(left.date).unix();
      });

      this.setState({
        notificationData: tmpList,
        notificationDataChange: !this.state.notificationDataChange,
      });
    }
  };

  setCurrencyToggleValue = (temp) => {
    this.props.setCurrencyToggleValue(temp);
  };

  render() {
    const {
      cardData,
      switchOn,
      CurrencyCode,
      transactions,
      balances,
      selectedBottomTab,
      modalData,
      qrBottomSheetsFlag,
      selectedTransactionItem,
      tabBarIndex,
      deepLinkModalOpen,
      knowMoreBottomSheetsFlag,
      errorMessageHeader,
      errorMessage,
      buttonText,
      addSubBottomSheetsFlag,
      selectedContact,
      notificationData,
      fbBTCAccount,
      loading,
      atCloseEnd,
      transactionsLoading,
      currencyCode,
      trustedContactRequest,
      recoveryRequest,
      custodyRequest,
      isLoadContacts,
      isLoading,
      isRequestModalOpened,
      isBalanceLoading,
      addContactModalOpened,
    } = this.state;
    const {
      navigation,
      notificationList,
      exchangeRates,
      accounts,
      walletName,
      UNDER_CUSTODY,
      downloadMShare,
      overallHealth,
    } = this.props;
    return (
      <ImageBackground
        source={require('../assets/images/home-bg.png')}
        style={{ width: '100%', height: '100%', flex: 1 }}
        imageStyle={{ resizeMode: 'stretch' }}
      >
        <StatusBar backgroundColor={Colors.blue} barStyle="light-content" />
        <View
          style={{
            flex: 3.8,
            paddingTop:
              Platform.OS == 'ios' && DeviceInfo.hasNotch ? hp('5%') : 0,
          }}
        >
          <HomeHeader
            onPressNotifications={this.onPressNotifications}
            notificationData={notificationData}
            walletName={walletName}
            switchOn={switchOn}
            getCurrencyImageByRegion={getCurrencyImageByRegion}
            balances={balances}
            exchangeRates={exchangeRates}
            CurrencyCode={currencyCode}
            navigation={this.props.navigation}
            overallHealth={overallHealth}
            onSwitchToggle={this.onSwitchToggle}
            setCurrencyToggleValue={this.setCurrencyToggleValue}
          />
        </View>

        <View style={{ flex: 7 }}>
          <View style={styles.cardViewContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cardData}
              extraData={{
                balances,
                switchOn,
                walletName,
                currencyCode,
                accounts,
                exchangeRates,
              }}
              keyExtractor={(_, index) => String(index)}
              renderItem={(Items) => (
                <HomeList
                  isBalanceLoading={isBalanceLoading}
                  Items={Items}
                  navigation={navigation}
                  getIconByAccountType={getIconByAccountType}
                  switchOn={switchOn}
                  accounts={accounts}
                  CurrencyCode={currencyCode}
                  balances={balances}
                  exchangeRates={exchangeRates}
                />
              )}
            />
          </View>
        </View>

        <CustomBottomTabs
          tabBarZIndex={tabBarIndex}
          selectTab={this.selectTab}
          selected={selectedBottomTab}
        />
        {/* {isLoading ? <Loader /> : null} */}

        {!isLoading && (
          <BottomSheet
            onOpenEnd={() => {
              this.setState({
                atCloseEnd: true,
                isLoading: false,
              });
            }}
            onCloseEnd={() => {
              this.setState(
                {
                  qrBottomSheetsFlag: false,
                },
                () => {
                  if (this.state.selectedBottomTab == 'Transactions') {
                    (this.refs.transactionTabBarBottomSheet as any).snapTo(1);
                  }
                },
              );
            }}
            onCloseStart={() => {
              this.setState({
                qrBottomSheetsFlag: false,
                atCloseEnd: false,
              });
            }}
            enabledInnerScrolling={true}
            ref={'transactionTabBarBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('18%')
                : Platform.OS == 'android'
                ? hp('19%')
                : hp('18%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('64%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('82%')
                : hp('82%'),
            ]}
            renderContent={() => (
              <TransactionsContent
                infoBoxInfoText={''}
                isFromAccount={false}
                transactionLoading={transactionsLoading}
                transactions={transactions}
                AtCloseEnd={atCloseEnd}
                setTransactionItem={(item) =>
                  this.setState({ selectedTransactionItem: item })
                }
                setTabBarZIndex={(index) =>
                  this.setState({ tabBarIndex: index })
                }
                TransactionDetailsBottomSheet={
                  this.refs.transactionDetailsBottomSheet
                }
              />
            )}
            renderHeader={() => (
              <TransactionHeader openCloseModal={this.openCloseModal} />
            )}
          />
        )}

        {!isLoading && (
          <BottomSheet
            ref="addTabBarBottomSheet"
            onCloseEnd={() => {
              this.setState({
                qrBottomSheetsFlag: false,
              });

              if (selectedBottomTab == 'Add') {
                (this.refs.addTabBarBottomSheet as any).snapTo(1);
              }
            }}
            onCloseStart={() => {
              this.setState({
                qrBottomSheetsFlag: false,
              });
            }}
            enabledInnerScrolling={true}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('18%')
                : Platform.OS == 'android'
                ? hp('19%')
                : hp('18%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('64%'),
            ]}
            renderContent={() => (
              <AddModalContents
                onPressElements={(type) => {
                  if (type == 'buyBitcoins') {
                    this.props.navigation.navigate('VoucherScanner');
                  } else if (type == 'addContact') {
                    this.setState(
                      {
                        // addSubBottomSheetsFlag: true,
                        isLoadContacts: true,
                        tabBarIndex: 0,
                      },
                      () =>
                        (this.refs
                          .addContactAddressBookBookBottomSheet as any).snapTo(
                          1,
                        ),
                    );
                  }
                }}
                addData={modalData}
              />
            )}
            renderHeader={() => (
              <TouchableOpacity
                activeOpacity={10}
                onPress={this.openCloseModal}
                style={styles.modalHeaderContainer}
              >
                <View style={styles.modalHeaderHandle} />
                <Text style={styles.modalHeaderTitleText}>{'Add'}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {!isLoading && (
          <BottomSheet
            ref="qrTabBarBottomSheet"
            onOpenEnd={() => {
              this.setState({
                qrBottomSheetsFlag: selectedBottomTab === 'QR',
              });
            }}
            onCloseEnd={() => {
              this.setState(
                {
                  qrBottomSheetsFlag: false,
                },
                () => {
                  if (selectedBottomTab === 'QR') {
                    (this.refs.qrTabBarBottomSheet as any).snapTo(1);
                  }
                },
              );
            }}
            onCloseStart={() => {
              this.setState({
                qrBottomSheetsFlag: false,
              });
            }}
            enabledInnerScrolling={true}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('18%')
                : Platform.OS == 'android'
                ? hp('19%')
                : hp('18%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('82%')
                : hp('82%'),
            ]}
            renderContent={() => (
              <QrCodeModalContents
                modalRef={this.refs.qrTabBarBottomSheet}
                isOpenedFlag={qrBottomSheetsFlag}
                onQrScan={(qrData) => this.processQRData(qrData)}
                onPressQrScanner={() => {
                  navigation.navigate('QrScanner', {
                    scanedCode: this.processQRData,
                  });
                }}
              />
            )}
            renderHeader={() => (
              <TouchableOpacity
                activeOpacity={10}
                onPress={this.openCloseModal}
                style={styles.modalHeaderContainer}
              >
                <View style={styles.modalHeaderHandle} />
                <Text style={styles.modalHeaderTitleText}>{'QR'}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {!isLoading && (
          <BottomSheet
            onCloseEnd={() => {
              this.setState(
                {
                  qrBottomSheetsFlag: false,
                },
                () => {
                  if (selectedBottomTab == 'More') {
                    (this.refs.moreTabBarBottomSheet as any).snapTo(1);
                  }
                },
              );
            }}
            onCloseStart={() => {
              this.setState({
                qrBottomSheetsFlag: false,
              });
            }}
            enabledInnerScrolling={true}
            ref={'moreTabBarBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('18%')
                : Platform.OS == 'android'
                ? hp('19%')
                : hp('18%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('64%'),
            ]}
            renderContent={() => (
              <MoreHomePageTabContents
                onPressElements={(item) => this.onPressElement(item)}
              />
            )}
            renderHeader={() => (
              <TouchableOpacity
                activeOpacity={10}
                onPress={() => this.openCloseModal()}
                style={styles.modalHeaderContainer}
              >
                <View style={styles.modalHeaderHandle} />
                <Text style={styles.modalHeaderTitleText}>{'More'}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {!isLoading && (
          <BottomSheet
            onCloseEnd={() => {
              if (tabBarIndex === 0 && !deepLinkModalOpen) {
                this.setState({
                  tabBarIndex: 999,
                });
              }
            }}
            onOpenEnd={() => {
              if (tabBarIndex == 999) {
                this.setState({
                  tabBarIndex: 0,
                });
              }
              this.setState({
                deepLinkModalOpen: true,
              });
            }}
            enabledInnerScrolling={true}
            ref={'custodianRequestBottomSheet'}
            snapPoints={[-50, hp('60%')]}
            renderContent={() => {
              if (!custodyRequest) {
                return null;
              }

              return (
                <CustodianRequestModalContents
                  loading={loading}
                  userName={custodyRequest.requester}
                  onPressAcceptSecret={() => {
                    this.setState(
                      {
                        loading: true,
                        tabBarIndex: 0,
                        deepLinkModalOpen: true,
                      },
                      () => {
                        (this.refs.custodianRequestBottomSheet as any).snapTo(
                          0,
                        );
                      },
                    );

                    if (Date.now() - custodyRequest.uploadedAt > 600000) {
                      Alert.alert(
                        'Request expired!',
                        'Please ask the sender to initiate a new request',
                      );
                      this.setState({
                        loading: false,
                      });
                    } else {
                      if (UNDER_CUSTODY[custodyRequest.requester]) {
                        Alert.alert(
                          'Failed to store',
                          'You cannot custody multiple shares of the same user.',
                        );
                        this.setState({ loading: false });
                      } else {
                        if (custodyRequest.isQR) {
                          downloadMShare(custodyRequest.ek, custodyRequest.otp);
                          this.setState({
                            loading: false,
                          });
                        } else {
                          navigation.navigate('CustodianRequestOTP', {
                            custodyRequest,
                          });
                          this.setState({
                            loading: false,
                          });
                        }
                      }
                    }
                  }}
                  onPressRejectSecret={() => {
                    this.setState(
                      {
                        tabBarIndex: 0,
                      },
                      () => {
                        (this.refs.custodianRequestBottomSheet as any).snapTo(
                          0,
                        );
                        (this.refs
                          .custodianRequestRejectedBottomSheet as any).snapTo(
                          1,
                        );
                      },
                    );
                  }}
                />
              );
            }}
            renderHeader={() => (
              <TransparentHeaderModal
                onPressheader={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                      deepLinkModalOpen: false,
                    },
                    () =>
                      (this.refs.custodianRequestBottomSheet as any).snapTo(0),
                  );
                }}
              />
            )}
          />
        )}
        {!isLoading && (
          <BottomSheet
            onCloseEnd={() => {
              if (tabBarIndex === 0) {
                this.setState({
                  tabBarIndex: 999,
                });
              }
              this.setState({
                isRequestModalOpened: false,
              });
            }}
            onOpenEnd={() => {
              if (tabBarIndex === 999) {
                this.setState({
                  tabBarIndex: 0,
                });
              }
              this.setState({
                deepLinkModalOpen: true,
                isRequestModalOpened: true,
              });
            }}
            enabledInnerScrolling={true}
            ref={'trustedContactRequestBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('70%'),
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('95%')
                : hp('95%'),
            ]}
            renderContent={() => {
              if (!trustedContactRequest && !recoveryRequest) {
                return;
              }
              return (
                <TrustedContactRequestContent
                  isRequestModalOpened={this.state.isRequestModalOpened}
                  trustedContactRequest={trustedContactRequest}
                  recoveryRequest={recoveryRequest}
                  onPressAccept={this.onTrustedContactRequestAccept}
                  onPressReject={this.onTrustedContactReject}
                  onPhoneNumberChange={this.onPhoneNumberChange}
                  bottomSheetRef={this.refs.trustedContactRequestBottomSheet}
                />
              );
            }}
            renderHeader={() => (
              <ModalHeader
                onPressHeader={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                      deepLinkModalOpen: false,
                    },
                    () => {
                      (this.refs
                        .trustedContactRequestBottomSheet as any).snapTo(0);
                    },
                  );
                }}
              />
            )}
          />
        )}

        {!isLoading && (
          <BottomSheet
            onCloseStart={() => {
              this.setState({
                tabBarIndex: 999,
              });
            }}
            onOpenEnd={() => {
              this.setState({
                tabBarIndex: 0,
              });
            }}
            enabledInnerScrolling={true}
            ref={'custodianRequestRejectedBottomSheet'}
            snapPoints={[-50, hp('60%')]}
            renderContent={() => {
              if (!custodyRequest) return null;
              return (
                <CustodianRequestRejectedModalContents
                  onPressViewThrustedContacts={() => {
                    this.setState(
                      {
                        tabBarIndex: 999,
                      },
                      () => {
                        (this.refs
                          .custodianRequestRejectedBottomSheet as any).snapTo(
                          0,
                        );
                      },
                    );
                  }}
                  userName={custodyRequest.requester}
                />
              );
            }}
            renderHeader={() => (
              <TransparentHeaderModal
                onPressheader={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                    },
                    () =>
                      (this.refs
                        .custodianRequestRejectedBottomSheet as any).snapTo(0),
                  );
                }}
              />
            )}
          />
        )}
        {knowMoreBottomSheetsFlag ? (
          <BottomSheet
            onOpenEnd={() => {
              if (!deepLinkModalOpen) {
                this.setState({
                  tabBarIndex: 0,
                });
              }
            }}
            onCloseEnd={() => {
              if (!deepLinkModalOpen) {
                this.setState({
                  tabBarIndex: 999,
                });
              }
            }}
            enabledInnerScrolling={true}
            ref={'allAccountsBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('64%'),
            ]}
            renderContent={() => (
              <AllAccountsContents
                onPressBack={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                    },
                    () => (this.refs.allAccountsBottomSheet as any).snapTo(0),
                  );
                }}
              />
            )}
            renderHeader={() => (
              <SmallHeaderModal
                borderColor={Colors.white}
                backgroundColor={Colors.white}
                onPressHeader={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                    },
                    () => (this.refs.allAccountsBottomSheet as any).snapTo(0),
                  );
                }}
              />
            )}
          />
        ) : null}

        {!isLoading && (
          <BottomSheet
            enabledInnerScrolling={true}
            onCloseEnd={() => {
              this.setState({
                tabBarIndex: 999,
              });
            }}
            onCloseStart={() => {
              this.setState({
                tabBarIndex: 999,
              });
            }}
            onOpenEnd={() => {
              this.setState({
                tabBarIndex: 0,
              });
            }}
            ref={'transactionDetailsBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('82%')
                : hp('82%'),
            ]}
            renderContent={() => (
              <TransactionDetails
                item={selectedTransactionItem}
                onPressKnowMore={() => {
                  (this.refs.transactionDetailsBottomSheet as any).snapTo(1);
                }}
              />
            )}
            renderHeader={() => (
              <SmallHeaderModal
                borderColor={Colors.white}
                backgroundColor={Colors.white}
                onPressHeader={() => {
                  if (this.refs.transactionDetailsBottomSheet)
                    (this.refs.transactionDetailsBottomSheet as any).snapTo(0);
                }}
              />
            )}
          />
        )}

        {knowMoreBottomSheetsFlag ? (
          <BottomSheet
            onOpenEnd={() => {
              if (!deepLinkModalOpen) {
                this.setState({
                  tabBarIndex: 0,
                });
              }
            }}
            onCloseEnd={() => {
              if (!deepLinkModalOpen) {
                this.setState({
                  tabBarIndex: 999,
                });
              }
            }}
            enabledInnerScrolling={true}
            ref={'settingsBottomSheet'}
            snapPoints={[
              -50,
              Platform.OS == 'ios' && DeviceInfo.hasNotch()
                ? hp('65%')
                : hp('64%'),
            ]}
            renderContent={() => (
              <SettingsContents
                currencyCode={CurrencyCode}
                onPressManagePin={(type, currencycode) =>
                  this.onPressSettingsElements(type, currencycode)
                }
                onPressBack={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                    },
                    () => {
                      (this.refs.settingsBottomSheet as any).snapTo(0);
                    },
                  );
                }}
              />
            )}
            renderHeader={() => (
              <SmallHeaderModal
                borderColor={Colors.white}
                backgroundColor={Colors.white}
                onPressHeader={() => {
                  this.setState(
                    {
                      tabBarIndex: 999,
                    },
                    () => (this.refs.settingsBottomSheet as any).snapTo(0),
                  );
                }}
              />
            )}
          />
        ) : null}

        <BottomSheet
          onOpenEnd={() => {
            this.setState({
              tabBarIndex: 0,
            });
          }}
          onCloseEnd={() => {
            this.setState({
              tabBarIndex: 999,
            });
          }}
          enabledInnerScrolling={true}
          ref={'errorBottomSheet'}
          snapPoints={[
            -50,
            Platform.OS == 'ios' && DeviceInfo.hasNotch()
              ? hp('35%')
              : hp('40%'),
          ]}
          renderContent={() => (
            <ErrorModalContents
              modalRef={this.refs.errorBottomSheet}
              title={errorMessageHeader}
              info={errorMessage}
              proceedButtonText={buttonText}
              onPressProceed={() => {
                this.setState(
                  {
                    tabBarIndex: 999,
                  },
                  () => {
                    (this.refs.errorBottomSheet as any).snapTo(0);
                  },
                );
              }}
              isBottomImage={true}
              bottomImage={require('../assets/images/icons/errorImage.png')}
            />
          )}
          renderHeader={() => (
            <ModalHeader
              onPressHeader={() => {
                this.setState(
                  {
                    tabBarIndex: 999,
                  },
                  () => (this.refs.errorBottomSheet as any).snapTo(0),
                );
              }}
            />
          )}
        />

        <BottomSheet
          onCloseEnd={() => {
            this.setState({
              addContactModalOpened: false,
            });
          }}
          onOpenEnd={() => {
            this.setState({
              tabBarIndex: 0,
              addContactModalOpened: true,
            });
          }}
          onOpenStart={() => {
            this.setState({
              tabBarIndex: 0,
            });
          }}
          onCloseStart={() => {
            this.setState({
              tabBarIndex: 999,
            });
          }}
          enabledInnerScrolling={true}
          ref={'addContactAddressBookBookBottomSheet'}
          snapPoints={[
            -50,
            Platform.OS == 'ios' && DeviceInfo.hasNotch()
              ? hp('82%')
              : hp('82%'),
          ]}
          renderContent={() => (
            <AddContactAddressBook
              addContactModalOpened={addContactModalOpened}
              isLoadContacts={isLoadContacts}
              modalRef={this.refs.addContactAddressBookBookBottomSheet}
              proceedButtonText={'Confirm & Proceed'}
              onPressContinue={() => {
                if (selectedContact && selectedContact.length) {
                  navigation.navigate('AddContactSendRequest', {
                    SelectedContact: selectedContact,
                  });
                  (this.refs
                    .addContactAddressBookBookBottomSheet as any).snapTo(0);
                }
              }}
              onSelectContact={(selectedContact) => {
                this.setState({
                  selectedContact,
                });
              }}
              onPressBack={() => {
                (this.refs.addContactAddressBookBookBottomSheet as any).snapTo(
                  0,
                );
              }}
              onSkipContinue={(data) => {
                if (data && data.length) {
                  navigation.navigate('AddContactSendRequest', {
                    SelectedContact: data,
                  });
                  (this.refs
                    .addContactAddressBookBookBottomSheet as any).snapTo(0);
                }
              }}
            />
          )}
          renderHeader={() => (
            <SmallHeaderModal
              borderColor={Colors.white}
              backgroundColor={Colors.white}
              onPressHeader={() => {
                (this.refs.addContactAddressBookBookBottomSheet as any).snapTo(
                  0,
                );
              }}
            />
          )}
        />

        <BottomSheet
          onOpenEnd={() => {
            this.setState(
              {
                tabBarIndex: 0,
              },
              () => this.onNotificationListOpen(),
            );
          }}
          onCloseEnd={() => {
            this.setState({
              tabBarIndex: 999,
            });
          }}
          enabledInnerScrolling={true}
          ref={'notificationsListBottomSheet'}
          snapPoints={[
            -50,
            Platform.OS == 'ios' && DeviceInfo.hasNotch()
              ? hp('82%')
              : hp('82%'),
          ]}
          renderContent={() => (
            <NotificationListContent
              notificationLoading={this.state.notificationLoading}
              NotificationData={notificationData}
              onNotificationClicked={(value) =>
                this.onNotificationClicked(value)
              }
              onPressBack={() => {
                (this.refs.notificationsListBottomSheet as any).snapTo(0);
              }}
            />
          )}
          renderHeader={() => (
            <ModalHeader
              onPressHeader={() => {
                (this.refs.notificationsListBottomSheet as any).snapTo(0);
              }}
            />
          )}
        />
        <BottomSheet
          onOpenEnd={() => {
            this.setState({
              tabBarIndex: 0,
            });
          }}
          onOpenStart={() => {
            this.setState({
              tabBarIndex: 0,
            });
          }}
          onCloseStart={() => {
            this.setState({
              tabBarIndex: 999,
            });
          }}
          enabledGestureInteraction={false}
          enabledInnerScrolling={true}
          ref={this.NoInternetBottomSheet}
          snapPoints={[-50, hp('60%')]}
          renderContent={() => (
            <NoInternetModalContents
              onPressTryAgain={() => {
                (this.NoInternetBottomSheet as any).current.snapTo(0);
              }}
              onPressIgnore={() => {
                (this.NoInternetBottomSheet as any).current.snapTo(0);
              }}
            />
          )}
          renderHeader={() => (
            <ModalHeader
            // onPressHeader={() => {
            //   (this.NoInternetBottomSheet as any).current.snapTo(0);
            // }}
            />
          )}
        />
      </ImageBackground>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    notificationList: state.notifications,
    exchangeRates: idx(state, (_) => _.accounts.exchangeRates),
    accounts: state.accounts || [],
    walletName:
      idx(state, (_) => _.storage.database.WALLET_SETUP.walletName) || '',
    UNDER_CUSTODY: idx(
      state,
      (_) => _.storage.database.DECENTRALIZED_BACKUP.UNDER_CUSTODY,
    ),
    s3Service: idx(state, (_) => _.sss.service),
    overallHealth: idx(state, (_) => _.sss.overallHealth),
    trustedContacts: idx(state, (_) => _.trustedContacts.service),
    paymentDetails: idx(state, (_) => _.trustedContacts.paymentDetails),
    notificationListNew: idx(state, (_) => _.notifications.notificationListNew),
    FBTCAccountData: idx(state, (_) => _.fbtc.FBTCAccountData),
    currencyCode: idx(state, (_) => _.preferences.currencyCode) || 'USD',
    currencyToggleValue: idx(state, (_) => _.preferences.currencyToggleValue),
    fcmTokenValue: idx(state, (_) => _.preferences.fcmTokenValue),
    secondaryDeviceAddressValue: idx(
      state,
      (_) => _.preferences.secondaryDeviceAddressValue,
    ),
    releaseCasesValue: idx(state, (_) => _.preferences.releaseCasesValue),
  };
};

export default withNavigationFocus(
  connect(mapStateToProps, {
    fetchEphemeralChannel,
    fetchNotifications,
    updateFCMTokens,
    downloadMShare,
    approveTrustedContact,
    fetchTrustedChannel,
    uploadRequestedShare,
    initHealthCheck,
    fetchDerivativeAccBalTx,
    addTransferDetails,
    clearPaymentDetails,
    notificationsUpdated,
    storeFbtcData,
    setCurrencyCode,
    setCurrencyToggleValue,
    updatePreference,
    setFCMToken,
    setSecondaryDeviceAddress,
    updateAddressBookLocally,
    updateLastSeen,
  })(HomeUpdated),
);

const styles = StyleSheet.create({
  card: {
    margin: 0,
    width: wp('42.6%'),
    height: hp('20.1%'),
    borderColor: Colors.borderColor,
    borderWidth: 1,
    marginRight: wp('2%'),
    marginBottom: wp('2%'),
    padding: wp('3'),
    backgroundColor: Colors.white,
  },
  cardTitle: {
    fontFamily: Fonts.FiraSansRegular,
    color: Colors.blue,
    fontSize: RFValue(10),
  },
  activeTabStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundColor,
    padding: 7,
    borderRadius: 7,
    width: 120,
    height: 40,
    justifyContent: 'center',
  },
  activeTabTextStyle: {
    marginLeft: 8,
    color: Colors.blue,
    fontFamily: Fonts.FiraSansRegular,
    fontSize: RFValue(12),
  },
  bottomTabBarContainer: {
    backgroundColor: Colors.white,
    justifyContent: 'space-evenly',
    display: 'flex',
    marginTop: 'auto',
    flexDirection: 'row',
    height: hp('12%'),
    alignItems: 'center',
    borderLeftColor: Colors.borderColor,
    borderLeftWidth: 1,
    borderRightColor: Colors.borderColor,
    borderRightWidth: 1,
    borderTopColor: Colors.borderColor,
    borderTopWidth: 1,
    paddingBottom: DeviceInfo.hasNotch() ? hp('4%') : 0,
  },
  cardViewContainer: {
    height: '100%',
    backgroundColor: Colors.backgroundColor,
    marginTop: hp('4%'),
    borderTopLeftRadius: 25,
    shadowColor: 'black',
    shadowOpacity: 0.4,
    shadowOffset: { width: 2, height: -1 },
    paddingTop: hp('1.5%'),
    paddingBottom: hp('5%'),
    width: '100%',
    overflow: 'hidden',
    paddingLeft: wp('3%'),
  },
  modalHeaderContainer: {
    backgroundColor: Colors.white,
    marginTop: 'auto',
    flex: 1,
    height:
      Platform.OS == 'ios' && DeviceInfo.hasNotch()
        ? 50
        : Platform.OS == 'android'
        ? 43
        : 40,
    borderTopLeftRadius: 10,
    borderLeftColor: Colors.borderColor,
    borderLeftWidth: 1,
    borderTopRightRadius: 10,
    borderRightColor: Colors.borderColor,
    borderRightWidth: 1,
    borderTopColor: Colors.borderColor,
    borderTopWidth: 1,
    zIndex: 9999,
  },
  modalHeaderHandle: {
    width: 50,
    height: 5,
    backgroundColor: Colors.borderColor,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 7,
  },
  modalHeaderTitleText: {
    color: Colors.blue,
    fontSize: RFValue(18),
    fontFamily: Fonts.FiraSansRegular,
    marginLeft: 15,
  },
  headerViewContainer: {
    marginTop: hp('2%'),
    marginLeft: 20,
    marginRight: 20,
  },
  headerTitleViewContainer: {
    flex: 7,
    justifyContent: 'space-between',
  },
  headerTitleText: {
    color: Colors.white,
    fontFamily: Fonts.FiraSansRegular,
    fontSize: RFValue(25),
    marginBottom: wp('3%'),
  },
  headerToggleSwitchContainer: {
    flex: 3,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerInfoText: {
    fontSize: RFValue(12),
    color: Colors.white,
  },
  headerButton: {
    backgroundColor: Colors.homepageButtonColor,
    height: hp('5%'),
    width: wp('35%'),
    borderRadius: 5,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontFamily: Fonts.FiraSansMedium,
    fontSize: RFValue(13),
    color: Colors.white,
  },
  cardBitCoinImage: {
    width: wp('3%'),
    height: wp('3%'),
    marginRight: 5,
    resizeMode: 'contain',
    marginBottom: wp('0.7%'),
  },
  cardAmountText: {
    color: Colors.black,
    fontFamily: Fonts.OpenSans,
    fontSize: RFValue(17),
    marginRight: 5,
    marginTop: 'auto',
    lineHeight: RFValue(17),
  },
  cardAmountTextGrey: {
    color: Colors.textColorGrey,
    fontFamily: Fonts.OpenSans,
    fontSize: RFValue(17),
    marginRight: 5,
    marginTop: 'auto',
    lineHeight: RFValue(17),
  },
  cardAmountUnitText: {
    color: Colors.textColorGrey,
    fontFamily: Fonts.FiraSansRegular,
    fontSize: RFValue(11),
    marginTop: 'auto',
    lineHeight: RFValue(17),
  },
  tabBarImage: {
    width: 21,
    height: 21,
    resizeMode: 'contain',
  },
  tabBarTabView: {
    padding: wp('5%'),
  },
  transactionModalElementView: {
    backgroundColor: Colors.backgroundColor,
    padding: hp('1%'),
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'space-between',
  },
  modalElementInfoView: {
    padding: hp('1%'),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionModalTitleText: {
    color: Colors.blue,
    fontSize: RFValue(12),
    marginBottom: 3,
    fontFamily: Fonts.FiraSansRegular,
  },
  transactionModalDateText: {
    color: Colors.textColorGrey,
    fontSize: RFValue(10),
    fontFamily: Fonts.FiraSansRegular,
  },
  transactionModalAmountView: {
    padding: 10,
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
  },
  transactionModalAmountText: {
    marginLeft: 5,
    marginRight: 5,
    fontSize: RFValue(20),
    fontFamily: Fonts.OpenSans,
  },
  transactionModalAmountUnitText: {
    color: Colors.textColorGrey,
    fontSize: RFValue(10),
    fontFamily: Fonts.OpenSans,
  },
  separatorView: {
    marginLeft: 15,
    marginRight: 15,
    height: 1,
    backgroundColor: Colors.borderColor,
  },
  modalContentContainer: {
    height: '100%',
    backgroundColor: Colors.white,
  },
});
