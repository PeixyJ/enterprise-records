import { Link } from 'react-router'
import {
  LayoutDashboardIcon,
  FileTextIcon,
  LandmarkIcon,
  BuildingIcon,
  Building2Icon,
  Settings2Icon,
  DownloadIcon,
  UploadIcon,
  FileSpreadsheetIcon,
  ShieldCheckIcon,
  HelpCircleIcon,
  CircleAlertIcon,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// ── 小组件 ──────────────────────────────────────────

function ModuleCard({ icon: Icon, title, to, children }: {
  icon: React.ElementType; title: string; to?: string; children: React.ReactNode
}) {
  const inner = (
    <Card className={to ? 'h-full transition-colors hover:bg-muted/50' : 'h-full'}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Icon className='size-4.5 text-primary' />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className='text-sm text-muted-foreground space-y-1.5'>
        {children}
      </CardContent>
    </Card>
  )
  return to ? <Link to={to} className='block'>{inner}</Link> : inner
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <p className='flex items-start gap-2 font-medium'>
        <HelpCircleIcon className='mt-0.5 size-4 shrink-0 text-primary' />
        {q}
      </p>
      <div className='ml-6 text-sm text-muted-foreground space-y-1'>{children}</div>
    </div>
  )
}

// ── 主页面 ──────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className='w-full'>
      <div className='border-b'>
        <div className='flex min-h-17 items-center px-6 py-3'>
          <span className='text-lg font-medium'>帮助支持</span>
        </div>
      </div>

      <div className='mx-auto max-w-5xl p-6 space-y-8'>
        {/* 简介 */}
        <section className='space-y-2'>
          <h2 className='text-xl font-semibold'>企业档案系统使用指南</h2>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            本系统用于汇集、归并和跟踪企业信息。日常工作流程为：从各部门收集的初筛信息导入系统，
            经乡镇反馈后将重点企业列入「市级」或「镇级」跟踪，记录每家企业的财务数据、上报来源与处置进展，
            并通过仪表盘随时掌握全局。所有数据保存在本机，无需联网。
          </p>
        </section>

        {/* 快速上手 */}
        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>快速上手</h3>
          <div className='grid gap-4 sm:grid-cols-3'>
            <Card>
              <CardContent className='space-y-2 pt-6'>
                <div className='flex items-center gap-2 font-medium'>
                  <Badge className='rounded-full'>1</Badge>
                  <DownloadIcon className='size-4' /> 下载模板
                </div>
                <p className='text-sm text-muted-foreground'>
                  在<span className='font-medium text-foreground'>仪表盘</span>右上角点击「下载模板」，
                  得到含「初筛 / 市级 / 镇级」工作表的 Excel 模板。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='space-y-2 pt-6'>
                <div className='flex items-center gap-2 font-medium'>
                  <Badge className='rounded-full'>2</Badge>
                  <FileSpreadsheetIcon className='size-4' /> 填写数据
                </div>
                <p className='text-sm text-muted-foreground'>
                  按模板格式填写企业信息。注意不要改动表头位置，
                  <span className='font-medium text-foreground'>序号列为空的行会被视为无效数据自动跳过</span>。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='space-y-2 pt-6'>
                <div className='flex items-center gap-2 font-medium'>
                  <Badge className='rounded-full'>3</Badge>
                  <UploadIcon className='size-4' /> 一键导入
                </div>
                <p className='text-sm text-muted-foreground'>
                  点击「一键导入」，将填好的 Excel 拖入弹窗或点击选择，
                  系统会自动把三个工作表归集到对应模块。
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 功能模块 */}
        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>功能模块</h3>
          <div className='grid gap-4 sm:grid-cols-2'>
            <ModuleCard icon={LayoutDashboardIcon} title='仪表盘' to='/app'>
              <p>查看初筛条数、规上企业、正常运营、列入市级/镇级等关键统计，并按乡镇、行业汇总。</p>
              <p>「超期时间节点提醒」会列出已到期但未处理的企业，「异常运营企业」汇总非正常运营的企业。</p>
              <p>右上角提供「下载模板」与「一键导入」。</p>
            </ModuleCard>

            <ModuleCard icon={FileTextIcon} title='初筛表' to='/app/screening'>
              <p>所有企业信息的总台账。支持按关键字、行业、乡镇、级别、上报时间筛选与分页浏览。</p>
              <p>点击企业名进入<span className='text-foreground'>企业详情</span>；点「乡镇反馈」可设置是否正常运营、是否列入市级/镇级/其他。</p>
              <p>支持单条删除与批量删除，以及按时间范围导出、按行业×乡镇分类导出。</p>
            </ModuleCard>

            <ModuleCard icon={LandmarkIcon} title='市级表 / 镇级表' to='/app/city'>
              <p>跟踪已列入市级、镇级的重点企业，记录经营/资产/负债/员工情况及处置进展。</p>
              <p>支持导入更新进展、导出全部、分类导出、导出分类问卷。</p>
              <p>状态标签区分「新增」「办结退出」，点「查看进展」可看完整时间轴。</p>
            </ModuleCard>

            <ModuleCard icon={Building2Icon} title='集团归集' to='/app/city'>
              <p>在市级/镇级表点「创建集团」，可把名称不同但实为关联企业的多家公司归并到同一集团统一跟踪。</p>
              <p>点集团名进入<span className='text-foreground'>集团详情</span>，集中查看成员企业、合并进展与各成员的部门数据。</p>
            </ModuleCard>

            <ModuleCard icon={BuildingIcon} title='企业详情'>
              <p>从初筛表点击企业名进入。分标签查看并编辑：基本信息、税务、人社、电力、水务、金融办、上报记录、企业进展。</p>
              <p>「镇级/市级时间轴」记录列入/退出的时间节点；「时间节点提醒」可为企业设置到期提醒，超期会在仪表盘汇总。</p>
            </ModuleCard>

            <ModuleCard icon={Settings2Icon} title='系统设置' to='/app/settings'>
              <p><span className='text-foreground'>基本设置</span>：维护「街道乡镇」和「行业」字典，决定筛选项与录入选项。</p>
              <p><span className='text-foreground'>高级设置</span>：导出/导入数据库备份、初始化系统，并查看版本信息（需管理员密码）。</p>
            </ModuleCard>
          </div>
        </section>

        {/* 导入规则 */}
        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>导入格式与归集规则</h3>
          <Card>
            <CardContent className='pt-6 text-sm space-y-3'>
              <div>
                <p className='font-medium'>初筛工作表</p>
                <p className='text-muted-foreground'>表头在第 5 行、数据从第 6 行开始。<span className='text-foreground'>社会信用代码（B 列）、企业名称（C 列）为必填项</span>。同一企业多次上报会自动按社会信用代码合并，并累计上报条数与各年度财务数据。</p>
              </div>
              <Separator />
              <div>
                <p className='font-medium'>市级 / 镇级工作表</p>
                <p className='text-muted-foreground'>表头在第 2–3 行、数据从第 4 行开始。导入时按社会信用代码或企业名称匹配到<span className='text-foreground'>已列入对应级别</span>的在库企业，更新其经营情况与进展。若企业尚未在初筛表中或未列入该级别，则不会被匹配。</p>
              </div>
              <Separator />
              <div className='flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-700'>
                <CircleAlertIcon className='mt-0.5 size-4 shrink-0' />
                <p>导入时会优先处理初筛表（可能更新企业的市级/镇级归属），再处理市级、镇级表。<span className='font-medium'>序号列为空的行一律视为无效数据跳过</span>；若有数据行缺少必填项，会精确提示是哪个工作表、哪个单元格。</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 数据安全 */}
        <section className='space-y-3'>
          <h3 className='text-base font-semibold'>数据安全与备份</h3>
          <Card>
            <CardContent className='pt-6 text-sm text-muted-foreground space-y-2'>
              <p className='flex items-start gap-2'>
                <ShieldCheckIcon className='mt-0.5 size-4 shrink-0 text-primary' />
                所有数据保存在本机，不上传云端。建议定期在<Link to='/app/advanced-settings' className='text-primary hover:underline'>高级设置</Link>中「导出备份」，得到完整的数据库文件妥善留存。
              </p>
              <p className='ml-6'>更换电脑或需要恢复时，在高级设置「导入备份文件」选择此前导出的 .sqlite / .db 文件覆盖即可。导入与初始化为不可撤销操作，需输入管理员密码确认。</p>
            </CardContent>
          </Card>
        </section>

        {/* 常见问题 */}
        <section className='space-y-4'>
          <h3 className='text-base font-semibold'>常见问题</h3>

          <Faq q='导入失败、提示某个单元格不能为空怎么办？'>
            <p>提示会指明具体工作表与单元格（如「初筛工作表第 8 行的 B8 单元格不能为空」）。请补全该单元格的社会信用代码或企业名称后重新导入。整行留空的行不会报错，会被直接跳过。</p>
          </Faq>

          <Faq q='市级 / 镇级表导入后没有更新？'>
            <p>市级/镇级导入只会更新「已在初筛表中且已列入对应级别」的企业。请先在初筛表导入该企业、并通过「乡镇反馈」将其列入市级或镇级，再导入市级/镇级表。</p>
          </Faq>

          <Faq q='最多能导入多少企业？'>
            <p>桌面版（安装后的应用）数据存于本地文件，可支持上万家企业；为保证操作流畅，建议单库控制在 1–2 万家以内。在浏览器中直接使用时，受浏览器本地存储约 5MB 限制，约可容纳 2000–3000 家企业，正式使用请用桌面版。</p>
          </Faq>

          <Faq q='不小心删错了数据能恢复吗？'>
            <p>删除、初始化均不可撤销。若此前在高级设置导出过备份，可通过「导入备份文件」恢复到备份时的状态。建议养成定期备份的习惯。</p>
          </Faq>

          <Faq q='忘记登录密码 / 管理员密码？'>
            <p>请联系系统部署或开发人员重置。导出备份、导入恢复、初始化系统等敏感操作均需管理员密码。</p>
          </Faq>
        </section>

        {/* 关于 */}
        <section className='space-y-2'>
          <Separator />
          <div className='text-xs text-muted-foreground space-y-0.5 pt-2'>
            <p>企业档案系统 · Enterprise Records</p>
            <p>构建时间：{__BUILD_TIME__}　版本标识：{__GIT_HASH__}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
