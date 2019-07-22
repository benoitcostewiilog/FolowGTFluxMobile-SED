import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ColisEditPage } from './colis-edit';
import { FileComponentModule } from '../../../components/file/file-component.module';

@NgModule({
  declarations: [
    ColisEditPage,
  ],
  imports: [
    IonicPageModule.forChild(ColisEditPage),
    FileComponentModule
  ],
  exports: [
    ColisEditPage
  ]
})
export class ColisEditPageModule { }
