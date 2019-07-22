import { Injectable } from '@angular/core';
import { AdmParametrageDBBase } from './base/adm-parametrage-db-base';

@Injectable()
export class AdmParametrageDB extends AdmParametrageDBBase {
    constructor() {
        super();
    }

    getTypePassage() {
        return this.getParametreObjectValue("type_passage");
    }
    getURLDownloadAPK() {
        return this.getParametreStringValue("url_download_apk");
    }
    getVersionNomade() {
        return this.getParametreStringValue("version_nomade");
    }
    isGestionEmplacement() {
        return this.getParametreBooleanValue("gestion_emplacement");
    }
    isLogoutPossiblePrise() {
        return this.getParametreBooleanValue("logout_possible_prise");
    }

    isAutoCreateEmplacement() {
        return this.getParametreBooleanValue("auto_create_emplacement");
    }
    isDisableScanBarcodeCamera() {
        return this.getParametreBooleanValue("disable_scan_barcode_camera");
    }

    isShowColisEnPrise() {
        return this.getParametreBooleanValue("show_colis_en_prise");
    }

    firstInputMethodEmplacement() {
        return this.getParametreStringValue("first_input_method_emplacement");
    }
    isTypeInputMethodEmplacementList() {
        return this.getParametreBooleanValue("input_method_emplacement_list");
    }
    isTypeInputMethodEmplacementInput() {
        return this.getParametreBooleanValue("input_method_emplacement_input");
    }
    isTypeInputMethodEmplacementScan() {
        return this.getParametreBooleanValue("input_method_emplacement_scan");
    }

    isVidageUMPriseProduit() {
        return this.getParametreBooleanValue("vidage_um_prise_produit");
    }

    isVidageUMDeposeUM() {
        return this.getParametreBooleanValue("vidage_um_depose_um");
    }

    isShowToggleVidageCompletUM() {
        return this.getParametreBooleanValue("toggle_vidage_complet_um");
    }

    isScanDeposeObligatoire() {
        return this.getParametreBooleanValue("scan_depose_obligatoire");
    }
    isDeposeProduitNonPris() {
        return this.getParametreBooleanValue("depose_produit_non_pris");
    }
    isPopupEmplacementDestinationInvalide() {
        return this.getParametreBooleanValue("popup_emplacement_destination_invalide");
    }

    isSignatureEcranPrise() {
        return this.getParametreBooleanValue("signature_ecran_prise");
    }

    isSignatureEcranDepose() {
        return this.getParametreBooleanValue("signature_ecran_depose");
    }

    getParametreIntValue(nom: string, defaut: number) {
        return new Promise<number>((resolve, reject) => {
            this.findBy("nom", nom).then((valeur) => {
                let valeurInt = defaut;
                if (valeur && valeur.length > 0) {

                    valeurInt = parseInt(valeur[0].valeur);
                }
                if (Number.isNaN(valeurInt)) {
                    valeurInt = defaut;
                }
                resolve(valeurInt);
            }, () => {
                resolve(defaut);
            })

        });
    }

    getParametreBooleanValue(nom: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.findBy("nom", nom).then((valeur) => {
                let res = true;
                if (valeur && valeur.length > 0) {
                    let valeurInt = parseInt(valeur[0].valeur);
                    if (valeurInt == 0) {
                        res = false;
                    }
                }
                resolve(res);
            }, () => {
                resolve(true);
            })

        });
    }

    getParametreStringValue(nom: string) {
        return new Promise<string>((resolve, reject) => {
            this.findBy("nom", nom).then((valeur) => {
                let res: string = null;
                if (valeur && valeur.length > 0) {
                    res = valeur[0].valeur;
                }
                resolve(res);
            }, () => {
                resolve(null);
            })

        });
    }
    getParametreObjectValue(nom: string) {
        return new Promise<any>((resolve, reject) => {
            this.findBy("nom", nom).then((valeur) => {
                let res: string = null;
                if (valeur && valeur.length > 0) {
                    res = valeur[0].valeur;
                }
                resolve(res);
            }, () => {
                resolve(null);
            })

        });
    }
}
