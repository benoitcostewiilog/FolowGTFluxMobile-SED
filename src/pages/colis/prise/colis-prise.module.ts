import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ColisPrisePage } from './colis-prise';
import { MouvementFilterModule } from '../../../pipes/mouvement-filter.module';
@NgModule({
  declarations: [
    ColisPrisePage,
  ],
  imports: [
    IonicPageModule.forChild(ColisPrisePage),
    MouvementFilterModule
  ],
  exports: [
    ColisPrisePage
  ]
})
export class ColisPrisePageModule { }
