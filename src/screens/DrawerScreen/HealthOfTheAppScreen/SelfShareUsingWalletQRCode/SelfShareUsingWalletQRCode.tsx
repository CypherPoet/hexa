import React from "react";
import { StyleSheet, ImageBackground, View, ScrollView, Platform, SafeAreaView, FlatList, TouchableOpacity, Dimensions } from "react-native";
import {
    Container,
    Header,
    Title,
    Content,
    Item,
    Input,
    Button,
    Left,
    Right,
    Body,
    Text,
    Icon,
    List,
    ListItem,
    Thumbnail
} from "native-base";
import { SvgIcon } from "@up-shared/components";
import IconFontAwe from "react-native-vector-icons/MaterialCommunityIcons";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Contacts from 'react-native-contacts';
import { Avatar, SearchBar } from 'react-native-elements';
// import QRCode from "react-native-qrcode";
import QRCode from 'react-native-qrcode-svg';

//TODO: Custome Pages
import CustomeStatusBar from "HexaWallet/src/app/custcompontes/CustomeStatusBar/CustomeStatusBar";


//TODO: Custome Pages
import Loader from "HexaWallet/src/app/custcompontes/Loader/ModelLoader";

//TODO: Custome Alert 
import AlertSimple from "HexaWallet/src/app/custcompontes/Alert/AlertSimple";
let alert = new AlertSimple();

//TODO: Custome StyleSheet Files       
import globalStyle from "HexaWallet/src/app/manager/Global/StyleSheet/Style";

//TODO: Custome Object
import { colors, images, localDB } from "HexaWallet/src/app/constants/Constants";
import renderIf from "HexaWallet/src/app/constants/validation/renderIf";
var utils = require( "HexaWallet/src/app/constants/Utils" );

//TODO: Bitcoin class
var bitcoinClassState = require( "HexaWallet/src/app/manager/ClassState/BitcoinClassState" );
import S3Service from "HexaWallet/src/bitcoin/services/sss/S3Service";

export default class SelfShareUsingWalletQRCode extends React.Component<any, any> {

    constructor ( props: any ) {
        super( props )
        this.state = ( {
            data: [],
            flag_Loading: false,
            msg_Loading: "Loading"
        } )
    }

    async componentWillMount() {
        let data = this.props.navigation.getParam( "data" );
        let encryptedMetaShare = JSON.parse( data.encryptedMetaShare )
        console.log( { encryptedMetaShare } );
        let walletDetails = utils.getWalletDetails();
        const sss = await bitcoinClassState.getS3ServiceClassState();
        var resGenerateEncryptedMetaShare = await sss.generateEncryptedMetaShare( encryptedMetaShare.metaShare );
        if ( resGenerateEncryptedMetaShare.status == 200 ) {
            resGenerateEncryptedMetaShare = resGenerateEncryptedMetaShare.data;
        } else {
            alert.simpleOk( "Oops", resGenerateEncryptedMetaShare.err );
        }
        const resUploadShare = await sss.uploadShare( resGenerateEncryptedMetaShare.encryptedMetaShare, resGenerateEncryptedMetaShare.messageId );
        if ( resUploadShare.status == 200 ) {
            await bitcoinClassState.setS3ServiceClassState( sss );
            let qrCodeData = {};
            qrCodeData.type = "Self Share";
            qrCodeData.wn = walletDetails.walletType;
            qrCodeData.data = resGenerateEncryptedMetaShare.key;
            //console.log( { qrCodeData } );   
            this.setState( {
                data: JSON.stringify( qrCodeData ).toString()
            } )
        } else {
            alert.simpleOk( "Oops", resUploadShare.err );
        }
    }


    goBack() {
        const { navigation } = this.props;
        navigation.goBack();
        navigation.state.params.onSelect( { selected: true } );
    }

    render() {
        //flag 
        let { flag_Loading } = this.state;
        return (
            <Container>
                <SafeAreaView style={ styles.container }>
                    <ImageBackground source={ images.WalletSetupScreen.WalletScreen.backgoundImage } style={ styles.container }>
                        <CustomeStatusBar backgroundColor={ colors.white } flagShowStatusBar={ false } barStyle="dark-content" />
                        <View style={ { marginLeft: 10, marginTop: 15 } }>
                            <Button
                                transparent
                                onPress={ () => this.goBack() }
                            >
                                <SvgIcon name="icon_back" size={ Platform.OS == "ios" ? 25 : 20 } color="#000000" />
                                <Text style={ [ globalStyle.ffFiraSansMedium, { color: "#000000", alignSelf: "center", fontSize: Platform.OS == "ios" ? 25 : 20, marginLeft: 0 } ] }>Share via QR</Text>
                            </Button>
                        </View>
                        <KeyboardAwareScrollView
                            enableOnAndroid
                            extraScrollHeight={ 40 }
                        >
                            <View style={ { flex: 0.1, margin: 20 } }>
                                <Text note style={ [ globalStyle.ffFiraSansMedium, { textAlign: "center" } ] }>Some information about the importance of trust with these contacts</Text>
                            </View>
                            <View style={ { flex: 1, alignItems: "center" } }>
                                <QRCode
                                    value={ this.state.data }
                                    size={ Dimensions.get( 'screen' ).width - 50 }
                                />
                            </View>
                            <View style={ { flex: 0.5, alignItems: "center" } }>
                                <Text note style={ [ globalStyle.ffFiraSansMedium, { textAlign: "center", margin: 10 } ] }>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut faucibus pulvinar elementum integer enim neque volutpat. Leo integer malesuada nunc vel. Purus faucibus ornare suspendisse sed nisi lacus sed. Et ligula ullamcorper malesuada proin libero nunc consequat. A cras semper auctor neque vitae tempus quam pellentesque. In nisl nisi scelerisque eu ultrices vitae auctor eu augue. Sed risus ultricies tristique nulla aliquet enim tortor. Curabitur gravida arcu ac tortor dignissim convallis. Adipiscing vitae proin sagittis nisl rhoncus mattis rhoncus urna neque. Porta lorem mollis aliquam ut porttitor Leo a.</Text>
                            </View>
                        </KeyboardAwareScrollView>

                    </ImageBackground>
                </SafeAreaView>
                <Loader loading={ flag_Loading } color={ colors.appColor } size={ 30 } />
            </Container >
        );
    }
}

const primaryColor = colors.appColor;
const styles = StyleSheet.create( {
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    }
} );