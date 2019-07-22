import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ColisListPage } from './colis-list';
import { MouvementFilterModule } from '../../../pipes/mouvement-filter.module';
@NgModule({
  declarations: [
    ColisListPage
  ],
  imports: [
    IonicPageModule.forChild(ColisListPage),
    MouvementFilterModule
  ],
  exports: [
    ColisListPage
  ]
})
export class ColisListPageModule { }
