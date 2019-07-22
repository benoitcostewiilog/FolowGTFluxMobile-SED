import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { EmplacementPage } from './emplacement';
import { EmplacementFilterModule } from '../../pipes/emplacement-filter.module';
@NgModule({
  declarations: [
    EmplacementPage,
  ],
  imports: [
    IonicPageModule.forChild(EmplacementPage),
    EmplacementFilterModule
  ],
  exports: [
    EmplacementPage
  ]
})
export class EmplacementModule { }
