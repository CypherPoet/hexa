import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import Fonts from '../../common/Fonts';
import BackupStyles from './Styles';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { getIconByStatus } from './utils';
import { useDispatch, useSelector } from 'react-redux';
import { uploadEncMShare } from '../../store/actions/sss';
import Colors from '../../common/Colors';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { RFValue } from 'react-native-responsive-fontsize';
import TransparentHeaderModal from '../../components/TransparentHeaderModal';
import ErrorModalContents from '../../components/ErrorModalContents';
import BottomSheet from 'reanimated-bottom-sheet';
import DeviceInfo from 'react-native-device-info';
import ModalHeader from '../../components/ModalHeader';
import { AppBottomSheetTouchableWrapper } from '../../components/AppBottomSheetTouchableWrapper';
import HistoryPageComponent from '../../components/HistoryPageComponent';

const SecurityQuestionHistory = props => {
  const [SelectedOption, setSelectedOption] = useState(0);
  const SelectOption = Id => {
    if (Id == SelectedOption) {
      setSelectedOption(0);
    } else {
      setSelectedOption(Id);
    }
  };

  const [secondaryDeviceHistory, setSecondaryDeviceHistory] = useState([
    {
      id: 1,
      title: 'Recovery Secret Not Accessible',
      date: '19 May ‘19, 11:00am',
      info: 'Lorem ipsum dolor Lorem dolor sit amet, consectetur dolor sit',
    },
    {
      id: 2,
      title: 'Recovery Secret Received',
      date: '1 June ‘19, 9:00am',
      info:
        'consectetur adipiscing Lorem ipsum dolor sit amet, consectetur sit amet',
    },
    {
      id: 3,
      title: 'Recovery Secret In-Transit',
      date: '30 May ‘19, 11:00am',
      info: 'Lorem ipsum dolor Lorem dolor sit amet, consectetur dolor sit',
    },
    {
      id: 4,
      title: 'Recovery Secret Accessible',
      date: '24 May ‘19, 5:00pm',
      info: 'Lorem ipsum Lorem ipsum dolor sit amet, consectetur sit amet',
    },
    {
      id: 5,
      title: 'Recovery Secret In-Transit',
      date: '20 May ‘19, 11:00am',
      info: 'Lorem ipsum dolor Lorem dolor sit amet, consectetur dolor sit',
    },
    {
      id: 6,
      title: 'Recovery Secret Not Accessible',
      date: '19 May ‘19, 11:00am',
      info: 'Lorem ipsum dolor Lorem dolor sit amet, consectetur dolor sit',
    },
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.backgroundColor }}>
      <SafeAreaView style={{ flex: 0, backgroundColor: Colors.backgroundColor }} />
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />
      <View style={{ ...styles.modalHeaderTitleView, paddingLeft: 10, paddingRight: 10, }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => { props.navigation.goBack(); }} style={{ height: 30, width: 30, justifyContent: "center" }} >
              <FontAwesome name="long-arrow-left" color={Colors.blue} size={17} />
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection:'row', marginLeft: 10, marginRight: 10, }}>
              <View style={{ flex: 1, justifyContent: "center" }}>
                  <Text style={BackupStyles.modalHeaderTitleText}>{props.navigation.state.params.selectedTitle}</Text>
                  <Text style={BackupStyles.modalHeaderInfoText}>
                      Last backup{' '}<Text style={{ fontFamily: Fonts.FiraSansMediumItalic, fontWeight: 'bold', }}> {props.navigation.state.params.selectedTime}</Text>
                  </Text>
              </View>
              <Image style={{...BackupStyles.cardIconImage, alignSelf:'center'}} source={getIconByStatus(props.navigation.state.params.selectedStatus)} />
            </View>
        </View>
      </View>
      <View style={{flex:1}}>
        <HistoryPageComponent 
          data={secondaryDeviceHistory}
          reshareInfo={'consectetur Lorem ipsum dolor sit amet, consectetur sit '}
          onPressConfirm={() => {
              // ConfirmBottomSheet.current.snapTo(1);
              alert("confirm")
          }}
        />
      </View>
    </View>
  );
};

export default SecurityQuestionHistory;

const styles = StyleSheet.create({
  modalHeaderTitleText: {
    color: Colors.blue,
    fontSize: RFValue(18),
    fontFamily: Fonts.FiraSansRegular,
  },
  modalHeaderTitleView: {
    borderBottomWidth: 1,
    borderColor: Colors.borderColor,
    alignItems: 'center',
    flexDirection: 'row',
    paddingRight: 10,
    paddingBottom: hp('3%'),
    marginTop:20,
    marginBottom: 15,
  },
});
