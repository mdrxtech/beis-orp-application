import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { ErrorFilter } from '../error.filter';
import { ViewDataInterceptor } from '../../view-data-interceptor.service';
import { documentTypes } from '../search/types/documentTypes';
import { SearchService } from '../search/search.service';
import { OrpSearchItem } from '../search/types/SearchResponse.dto';
import TnaDocMeta from './types/TnaDocMeta';
import { Regulator } from '../regulator/types/Regulator';
import regulators from '../regulator/config/regulators';

@UseFilters(ErrorFilter)
@UseInterceptors(ViewDataInterceptor)
@Controller('document')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly searchService: SearchService,
  ) {}
  @Get('/view/:id')
  @Render('pages/document')
  async getDocument(@Param() params: { id: string }): Promise<{
    document: OrpSearchItem;
    url: string;
    regulator: Regulator;
    docType: string;
  }> {
    const orpDoc = await this.documentService.getDocumentWithPresignedUrl(
      params.id,
    );
    const regulator = regulators.find(
      (reg) => reg.name === orpDoc.document.creator,
    );
    const docType = documentTypes[orpDoc.document.documentType] ?? '';
    return {
      ...orpDoc,
      regulator,
      docType,
    };
  }
  @Get('/linked-documents')
  @Render('pages/document/linkedDocuments')
  async getLinkedDocuments(@Query() { id }: { id: string }): Promise<{
    documentData: TnaDocMeta;
    linkedDocuments: OrpSearchItem[];
    href: string;
  }> {
    const documentData = await this.documentService.getTnaDocument(id);
    const { documents } = await this.searchService.getLinkedDocuments({
      legislation_href: id,
    });

    return {
      href: id,
      documentData,
      linkedDocuments: documents?.[0]?.relatedDocuments || [],
    };
  }
}
