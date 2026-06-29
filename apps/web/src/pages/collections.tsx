import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderIcon,
  HashIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TAG_COLOR_CLASSES, TAG_COLORS, useStore } from '@/lib/store';

export function CollectionsPage() {
  const {
    tags,
    collections,
    repos,
    createTag,
    renameTag,
    deleteTag,
    createCollection,
    renameCollection,
    deleteCollection,
  } = useStore();

  const repoCountByTag = (tagId: string) => repos.filter((r) => r.tagIds.includes(tagId)).length;
  const repoCountByCollection = (cId: string) =>
    repos.filter((r) => r.collectionIds.includes(cId)).length;

  // tag dialog state
  const [tagDialog, setTagDialog] = useState<{
    open: boolean;
    id?: string;
    name: string;
    color: string;
  }>({ open: false, name: '', color: TAG_COLORS[0] });

  // collection dialog state
  const [colDialog, setColDialog] = useState<{
    open: boolean;
    id?: string;
    name: string;
    description: string;
  }>({ open: false, name: '', description: '' });

  const saveTag = () => {
    const name = tagDialog.name.trim();
    if (!name) return;
    if (tagDialog.id) renameTag(tagDialog.id, name);
    else createTag(name, tagDialog.color);
    setTagDialog({ open: false, name: '', color: TAG_COLORS[0] });
  };

  const saveCollection = () => {
    const name = colDialog.name.trim();
    if (!name) return;
    if (colDialog.id) renameCollection(colDialog.id, name, colDialog.description.trim());
    else createCollection(name, colDialog.description.trim());
    setColDialog({ open: false, name: '', description: '' });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">标签与集合</h1>
        <p className="text-sm text-muted-foreground">
          用标签做横向标记、用集合做纵向归类，给星图建立你自己的秩序。
        </p>
      </header>

      <Tabs defaultValue="collections" className="gap-6">
        <TabsList>
          <TabsTrigger value="collections">
            <FolderIcon data-icon="inline-start" />
            集合
            <Badge variant="secondary">{collections.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tags">
            <HashIcon data-icon="inline-start" />
            标签
            <Badge variant="secondary">{tags.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Collections */}
        <TabsContent value="collections" className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setColDialog({ open: true, name: '', description: '' })}
            >
              <PlusIcon data-icon="inline-start" />
              新建集合
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Card key={c.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <FolderIcon className="size-5" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreVerticalIcon />
                          <span className="sr-only">操作</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setColDialog({
                              open: true,
                              id: c.id,
                              name: c.name,
                              description: c.description ?? '',
                            })
                          }
                        >
                          <PencilIcon data-icon="inline-start" />
                          重命名
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => deleteCollection(c.id)}>
                          <TrashIcon data-icon="inline-start" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="mt-2">{c.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {c.description || '暂无描述'}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="mt-auto justify-between">
                  <span className="text-sm text-muted-foreground">{repoCountByCollection(c.id)} 个仓库</span>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/app/collections/${c.id}`}>查看</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags" className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => setTagDialog({ open: true, name: '', color: TAG_COLORS[0] })}
            >
              <PlusIcon data-icon="inline-start" />
              新建标签
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className={cn('border-transparent', TAG_COLOR_CLASSES[t.color])}>
                      <HashIcon data-icon="inline-start" />
                      {t.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {repoCountByTag(t.id)} 个仓库
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setTagDialog({ open: true, id: t.id, name: t.name, color: t.color })
                      }
                    >
                      <PencilIcon />
                      <span className="sr-only">重命名</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTag(t.id)}>
                      <TrashIcon />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tag dialog */}
      <Dialog
        open={tagDialog.open}
        onOpenChange={(open) => setTagDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tagDialog.id ? '重命名标签' : '新建标签'}</DialogTitle>
            <DialogDescription>标签用于跨集合地横向标记仓库。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tag-name">名称</Label>
              <Input
                id="tag-name"
                value={tagDialog.name}
                placeholder="例如：must-read"
                onChange={(e) => setTagDialog((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            {!tagDialog.id && (
              <div className="flex flex-col gap-2">
                <Label>颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTagDialog((s) => ({ ...s, color }))}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium ring-2 ring-transparent transition',
                        TAG_COLOR_CLASSES[color],
                        tagDialog.color === color && 'ring-ring',
                      )}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTagDialog({ open: false, name: '', color: TAG_COLORS[0] })}
            >
              取消
            </Button>
            <Button onClick={saveTag}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection dialog */}
      <Dialog
        open={colDialog.open}
        onOpenChange={(open) => setColDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{colDialog.id ? '编辑集合' : '新建集合'}</DialogTitle>
            <DialogDescription>集合用于把相关仓库纵向归类成一个主题。</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="col-name">名称</Label>
              <Input
                id="col-name"
                value={colDialog.name}
                placeholder="例如：前端武器库"
                onChange={(e) => setColDialog((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="col-desc">描述</Label>
              <Textarea
                id="col-desc"
                rows={3}
                value={colDialog.description}
                placeholder="这个集合收集了什么？"
                onChange={(e) => setColDialog((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setColDialog({ open: false, name: '', description: '' })}
            >
              取消
            </Button>
            <Button onClick={saveCollection}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
